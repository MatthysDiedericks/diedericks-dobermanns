-- Litter records: per-puppy birth details, honest litter counts, collar backfill,
-- litter_media public gate, litter_todos staff RLS, default born checklist, audit.

-- ---------------------------------------------------------------------------
-- 1. Per-puppy birth details on dogs
-- ---------------------------------------------------------------------------
alter table public.dogs
  add column if not exists birth_order integer
    check (birth_order is null or birth_order > 0),
  add column if not exists birth_time time,
  add column if not exists birth_type text
    check (birth_type is null or birth_type in ('natural', 'assisted', 'c_section')),
  add column if not exists deceased_at date,
  add column if not exists deceased_cause text;

create unique index if not exists dogs_litter_birth_order_key
  on public.dogs (litter_id, birth_order)
  where litter_id is not null and birth_order is not null;

-- ---------------------------------------------------------------------------
-- 2. Keep litters counts honest from puppy rows
-- ---------------------------------------------------------------------------
create or replace function public.recalc_litter_puppy_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_litter_id uuid;
begin
  target_litter_id := coalesce(new.litter_id, old.litter_id);
  if target_litter_id is null then
    return coalesce(new, old);
  end if;

  -- When a puppy moves between litters, refresh both.
  if tg_op = 'UPDATE'
     and old.litter_id is not null
     and new.litter_id is not null
     and old.litter_id is distinct from new.litter_id then
    update public.litters l
    set
      puppy_count = sub.total,
      male_count = sub.males,
      female_count = sub.females,
      deceased_count = sub.deceased
    from (
      select
        count(*)::int as total,
        count(*) filter (
          where sex = 'male' and coalesce(status, '') not in ('deceased', 'stillborn')
        )::int as males,
        count(*) filter (
          where sex = 'female' and coalesce(status, '') not in ('deceased', 'stillborn')
        )::int as females,
        count(*) filter (
          where coalesce(status, '') in ('deceased', 'stillborn')
        )::int as deceased
      from public.dogs
      where litter_id = old.litter_id
    ) sub
    where l.id = old.litter_id;
  end if;

  update public.litters l
  set
    puppy_count = sub.total,
    male_count = sub.males,
    female_count = sub.females,
    deceased_count = sub.deceased
  from (
    select
      count(*)::int as total,
      count(*) filter (
        where sex = 'male' and coalesce(status, '') not in ('deceased', 'stillborn')
      )::int as males,
      count(*) filter (
        where sex = 'female' and coalesce(status, '') not in ('deceased', 'stillborn')
      )::int as females,
      count(*) filter (
        where coalesce(status, '') in ('deceased', 'stillborn')
      )::int as deceased
    from public.dogs
    where litter_id = target_litter_id
  ) sub
  where l.id = target_litter_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_dogs_recalc_litter_counts on public.dogs;
create trigger trg_dogs_recalc_litter_counts
  after insert or delete or update of litter_id, sex, status
  on public.dogs
  for each row
  execute function public.recalc_litter_puppy_counts();

-- ---------------------------------------------------------------------------
-- 3. Back-fill collar_colour from names like "Puppy 1 (Pink)" — leave names alone
-- ---------------------------------------------------------------------------
do $$
declare
  updated_count integer;
begin
  with matched as (
    select
      id,
      lower(trim(substring(name from '\(([A-Za-z ]+)\)$'))) as colour
    from public.dogs
    where collar_colour is null
      and name ~ '\(([A-Za-z ]+)\)$'
  )
  update public.dogs d
  set collar_colour = m.colour
  from matched m
  where d.id = m.id
    and m.colour is not null
    and length(m.colour) > 0;

  get diagnostics updated_count = row_count;
  raise notice 'collar_colour backfill updated % dog rows', updated_count;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. litter_media public/consent column + RLS (mirror dog_media gate)
-- ---------------------------------------------------------------------------
alter table public.litter_media
  add column if not exists is_public boolean not null default false;

-- Replace broad public-litter policy with per-image + litter public gate.
drop policy if exists "Public litter media viewable for public litters" on public.litter_media;
create policy "Public litter media viewable when marked public"
  on public.litter_media
  for select
  using (
    is_public = true
    and exists (
      select 1 from public.litters l
      where l.id = litter_media.litter_id
        and l.is_public = true
    )
  );

-- Staff read (trainers+) / admin write for todos — clients never see todos.
drop policy if exists "admin_all_todos" on public.litter_todos;
drop policy if exists "litter_todos staff read" on public.litter_todos;
drop policy if exists "litter_todos admin write" on public.litter_todos;

create policy "litter_todos staff read" on public.litter_todos
  for select using (public.is_trainer_or_above());

create policy "litter_todos admin write" on public.litter_todos
  for all using (public.is_admin()) with check (public.is_admin());

-- Ensure litter_media still has admin write (keep existing admin_all_media) and
-- trainer/admin can always read media for kennel work.
drop policy if exists "litter_media staff read" on public.litter_media;
create policy "litter_media staff read" on public.litter_media
  for select using (public.is_trainer_or_above());

-- ---------------------------------------------------------------------------
-- 5. Seed default checklist once when a litter is marked born
-- ---------------------------------------------------------------------------
create or replace function public.seed_litter_todos_on_born()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_date date;
  already integer;
  new_born boolean;
  old_born boolean;
begin
  new_born :=
    coalesce(new.status, '') in ('born', 'available', 'placed', 'whelped', 'nursing', 'active')
    or new.actual_date is not null;
  old_born :=
    tg_op = 'UPDATE'
    and (
      coalesce(old.status, '') in ('born', 'available', 'placed', 'whelped', 'nursing', 'active')
      or old.actual_date is not null
    );

  -- Seed once on first transition into a born-like state — never on later edits.
  if not new_born then
    return new;
  end if;
  if tg_op = 'UPDATE' and old_born then
    return new;
  end if;

  select count(*)::int into already
  from public.litter_todos
  where litter_id = new.id;

  if already > 0 then
    return new;
  end if;

  base_date := coalesce(new.actual_date, current_date);

  insert into public.litter_todos (litter_id, title, description, due_date)
  values
    (new.id, 'Dew claws', 'Remove dew claws if practised for this litter.', base_date + 3),
    (new.id, 'First deworming', 'Day 14 deworming; continue fortnightly.', base_date + 14),
    (new.id, 'Second deworming', 'Fortnightly follow-up after first deworming.', base_date + 28),
    (new.id, 'Third deworming', 'Fortnightly follow-up.', base_date + 42),
    (new.id, 'First vaccination', 'Core vaccines at approximately 6 weeks.', base_date + 42),
    (new.id, 'Microchipping', 'Implant and record microchip numbers.', base_date + 49),
    (new.id, 'Registration papers', 'Prepare KUSA / registry paperwork.', base_date + 56),
    (new.id, 'Vet check', 'Pre-go-home veterinary health check.', coalesce(new.go_home_date, base_date + 70) - 7),
    (new.id, 'Go-home packs', 'Assemble contracts, care sheets, and packs for buyers.', coalesce(new.go_home_date, base_date + 70) - 3);

  return new;
end;
$$;

drop trigger if exists trg_litters_seed_todos_on_born on public.litters;
create trigger trg_litters_seed_todos_on_born
  after insert or update of status, actual_date
  on public.litters
  for each row
  execute function public.seed_litter_todos_on_born();

-- ---------------------------------------------------------------------------
-- 6. Audit trail
-- ---------------------------------------------------------------------------
select public.enable_audit('weight_logs');
select public.enable_audit('litter_media');
select public.enable_audit('litter_todos');
