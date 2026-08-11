-- 0059_breeding_cycle_capture.sql
-- Multi-mating rows, pregnancy outcome, whelping temperatures, progesterone table.
-- heat_cycles.mating_date / sire_id stay populated as derived columns for existing screens.

-- ---------------------------------------------------------------------------
-- 1. matings — one row per covering, not one per cycle
-- ---------------------------------------------------------------------------
create table if not exists public.matings (
  id                 uuid primary key default gen_random_uuid(),
  heat_cycle_id      uuid not null references public.heat_cycles(id) on delete cascade,
  sire_id            uuid references public.dogs(id) on delete set null,
  external_sire_name text,
  mated_at           timestamptz not null,
  mating_type        text not null default 'natural'
                       check (mating_type in ('natural','ai_fresh','ai_chilled','ai_frozen')),
  tie_minutes        integer check (tie_minutes is null or (tie_minutes >= 0 and tie_minutes <= 180)),
  successful         boolean,
  notes              text,
  created_by         uuid references auth.users(id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint matings_sire_required check (sire_id is not null or external_sire_name is not null)
);

create index if not exists matings_heat_cycle_id_idx
  on public.matings(heat_cycle_id, mated_at);
create index if not exists matings_sire_id_idx
  on public.matings(sire_id) where sire_id is not null;

comment on table public.matings is
  'One row per mating/covering. heat_cycles.mating_date and sire_id are derived from the earliest row.';

-- Keep heat_cycles.mating_date / sire_id / mating_type in sync with the FIRST mating.
-- Those columns are derived, not authoritative — existing screens and litter pages still read them.
create or replace function public.sync_heat_cycle_from_matings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cycle_id uuid;
  v_first    record;
begin
  v_cycle_id := coalesce(new.heat_cycle_id, old.heat_cycle_id);

  select m.mated_at, m.sire_id, m.mating_type
    into v_first
  from public.matings m
  where m.heat_cycle_id = v_cycle_id
  order by m.mated_at asc
  limit 1;

  if found then
    update public.heat_cycles
       set mating_date = (v_first.mated_at at time zone 'UTC')::date,
           sire_id     = v_first.sire_id,
           mating_type = v_first.mating_type,
           updated_at  = now()
     where id = v_cycle_id;
  else
    update public.heat_cycles
       set mating_date = null,
           sire_id     = null,
           mating_type = null,
           updated_at  = now()
     where id = v_cycle_id;
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_matings_sync_heat_cycle on public.matings;
create trigger trg_matings_sync_heat_cycle
  after insert or update or delete on public.matings
  for each row execute function public.sync_heat_cycle_from_matings();

comment on column public.heat_cycles.mating_date is
  'DERIVED from matings (earliest mated_at). Authoritative source is public.matings as of 11 Aug 2026.';
comment on column public.heat_cycles.sire_id is
  'DERIVED from the earliest mating row in public.matings. Prefer matings.sire_id for history.';

-- ---------------------------------------------------------------------------
-- 2. Pregnancy outcome on heat_cycles
-- ---------------------------------------------------------------------------
alter table public.heat_cycles
  add column if not exists pregnancy_status text
    check (pregnancy_status is null or pregnancy_status in (
      'not_yet_known','not_pregnant','pregnant','false_pregnancy',
      'loss_early','loss_late','loss_unspecified')),
  add column if not exists pregnancy_confirmed_date date,
  add column if not exists pregnancy_confirmed_method text
    check (pregnancy_confirmed_method is null or pregnancy_confirmed_method in
      ('ultrasound','relaxin','palpation','x_ray','observed')),
  add column if not exists pregnancy_notes text;

comment on column public.heat_cycles.pregnancy_status is
  'Outcome separate from cycle stage. loss_early = before day 45; loss_late = after day 45.';
comment on column public.heat_cycles.pregnancy_confirmed_method is
  'How pregnancy was confirmed when pregnancy_status = pregnant.';

-- ---------------------------------------------------------------------------
-- 3. whelping_temperatures (Celsius only)
-- ---------------------------------------------------------------------------
create table if not exists public.whelping_temperatures (
  id            uuid primary key default gen_random_uuid(),
  heat_cycle_id uuid not null references public.heat_cycles(id) on delete cascade,
  taken_at      timestamptz not null,
  temp_c        numeric(4,1) not null check (temp_c >= 33 and temp_c <= 43),
  notes         text,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now()
);

create index if not exists whelping_temperatures_cycle_idx
  on public.whelping_temperatures(heat_cycle_id, taken_at);

comment on table public.whelping_temperatures is
  'Rectal temperatures in Celsius only. Drop below 37.2 °C predicts whelping within ~24h.';

-- ---------------------------------------------------------------------------
-- 4. progesterone_tests table (with units) + back-fill from JSONB
-- ---------------------------------------------------------------------------
create table if not exists public.progesterone_tests (
  id            uuid primary key default gen_random_uuid(),
  heat_cycle_id uuid not null references public.heat_cycles(id) on delete cascade,
  tested_at     timestamptz not null,
  value         numeric(8,2) not null check (value >= 0),
  unit          text not null check (unit in ('ng_ml','nmol_l')),
  value_ng_ml   numeric(8,2) generated always as
                  (case when unit = 'ng_ml' then value else round(value / 3.18, 2) end) stored,
  test_phase    text not null default 'ovulation_timing'
                  check (test_phase in ('ovulation_timing','reverse')),
  lab           text,
  notes         text,
  created_by    uuid references auth.users(id),
  created_at    timestamptz not null default now()
);

create index if not exists progesterone_tests_cycle_idx
  on public.progesterone_tests(heat_cycle_id, tested_at);

comment on table public.progesterone_tests is
  'Progesterone readings with unit. Compare/interpret via value_ng_ml. reverse = late-gestation.';

-- Back-fill from heat_cycles.progesterone_tests JSONB (assumed ng/mL).
do $$
declare
  r record;
  elem jsonb;
  v_date text;
  v_val numeric;
begin
  for r in
    select id, progesterone_tests
    from public.heat_cycles
    where progesterone_tests is not null
      and jsonb_typeof(progesterone_tests) = 'array'
      and jsonb_array_length(progesterone_tests) > 0
  loop
    -- Skip cycles already migrated (idempotent re-run).
    if exists (
      select 1 from public.progesterone_tests pt where pt.heat_cycle_id = r.id
    ) then
      continue;
    end if;

    for elem in select * from jsonb_array_elements(r.progesterone_tests)
    loop
      v_date := elem->>'date';
      begin
        v_val := (elem->>'value_ng_ml')::numeric;
      exception when others then
        v_val := null;
      end;

      if v_date is null or v_val is null then
        continue;
      end if;

      insert into public.progesterone_tests (
        heat_cycle_id, tested_at, value, unit, test_phase, lab, notes
      ) values (
        r.id,
        (v_date::date)::timestamptz,
        v_val,
        'ng_ml',
        'ovulation_timing',
        nullif(elem->>'lab', ''),
        nullif(elem->>'notes', '')
      );
    end loop;
  end loop;
end;
$$;

comment on column public.heat_cycles.progesterone_tests is
  'SUPERSEDED 11 Aug 2026 by public.progesterone_tests. Left in place unread after back-fill; do not drop yet.';

-- ---------------------------------------------------------------------------
-- 5. RLS — match heat_cycles staff read / admin write. Clients: none.
-- ---------------------------------------------------------------------------
alter table public.matings enable row level security;
alter table public.whelping_temperatures enable row level security;
alter table public.progesterone_tests enable row level security;

drop policy if exists "matings admin full" on public.matings;
create policy "matings admin full" on public.matings
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "matings staff read" on public.matings;
create policy "matings staff read" on public.matings
  for select using (public.is_trainer_or_above());

drop policy if exists "whelping_temperatures admin full" on public.whelping_temperatures;
create policy "whelping_temperatures admin full" on public.whelping_temperatures
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "whelping_temperatures staff read" on public.whelping_temperatures;
create policy "whelping_temperatures staff read" on public.whelping_temperatures
  for select using (public.is_trainer_or_above());

drop policy if exists "progesterone_tests admin full" on public.progesterone_tests;
create policy "progesterone_tests admin full" on public.progesterone_tests
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "progesterone_tests staff read" on public.progesterone_tests;
create policy "progesterone_tests staff read" on public.progesterone_tests
  for select using (public.is_trainer_or_above());

-- Audit trail (enable_audit attaches trg_audit). Breeding records are evidentiary.
select public.enable_audit('matings');
select public.enable_audit('whelping_temperatures');
select public.enable_audit('progesterone_tests');
