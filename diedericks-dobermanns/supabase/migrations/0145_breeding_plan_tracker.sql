-- 0145 — Breeding plan tracker. Status is derived in the view, not triggers.

create table public.breeding_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  objective text not null,
  status text not null default 'active'
    check (status in ('active','paused','completed','abandoned')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.breeding_plans is
  'Named multi-year succession plans. One row per line of work.';

create table public.breeding_plan_steps (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.breeding_plans(id) on delete cascade,
  step_order integer not null,
  title text not null,
  detail text,
  step_type text not null check (step_type in
    ('mating','whelp','select_keeper','raise','train','health_test','breed_next','retire','other')),
  status text not null default 'planned'
    check (status in ('planned','ready','in_progress','done','blocked','skipped')),
  dam_id uuid references public.dogs(id) on delete set null,
  sire_id uuid references public.dogs(id) on delete set null,
  litter_id uuid references public.litters(id) on delete set null,
  heat_cycle_id uuid references public.heat_cycles(id) on delete set null,
  result_dog_id uuid references public.dogs(id) on delete set null,
  expected_start date,
  expected_end date,
  actual_at date,
  blocked_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plan_id, step_order)
);

comment on table public.breeding_plan_steps is
  'Ordered steps. Titles are plain English. Prefix notes with OVERRIDE: to skip derivation.';

create index breeding_plans_status_idx on public.breeding_plans (status);
create index breeding_plan_steps_plan_order_idx
  on public.breeding_plan_steps (plan_id, step_order);
create index breeding_plan_steps_heat_idx
  on public.breeding_plan_steps (heat_cycle_id) where heat_cycle_id is not null;
create index breeding_plan_steps_litter_idx
  on public.breeding_plan_steps (litter_id) where litter_id is not null;

create trigger breeding_plans_set_updated_at
  before update on public.breeding_plans
  for each row execute function public.set_updated_at();
create trigger breeding_plan_steps_set_updated_at
  before update on public.breeding_plan_steps
  for each row execute function public.set_updated_at();

-- Derived status. Reads heats/matings/litters/dogs. No write-path triggers.
create or replace view public.v_breeding_plan_steps
with (security_invoker = true) as
select
  s.*,
  case
    when s.status in ('skipped', 'blocked') then s.status
    when s.notes like 'OVERRIDE:%' then s.status
    when s.step_type = 'mating' and s.heat_cycle_id is not null then
      case
        when hc.mating_date is not null
          or exists (select 1 from public.matings m where m.heat_cycle_id = s.heat_cycle_id)
          or hc.resulting_litter_id is not null
          or lit.actual_date is not null
        then 'done'
        when hc.status in ('in_heat', 'active', 'mated')
        then 'in_progress'
        else s.status
      end
    when s.step_type = 'whelp' then
      case
        when lit.actual_date is not null or hc.actual_whelp_date is not null
        then 'done'
        else s.status
      end
    when s.step_type = 'select_keeper' then
      case when s.result_dog_id is not null then 'done' else s.status end
    when s.step_type = 'health_test' then
      case
        when dog.id is not null and (
          (lower(coalesce(s.title,'') || ' ' || coalesce(s.detail,'')) like '%holter%'
            and nullif(dog.holter_result, 'Pending') is not null)
          or ((lower(coalesce(s.title,'') || ' ' || coalesce(s.detail,'')) like '%hip%'
              or lower(coalesce(s.title,'') || ' ' || coalesce(s.detail,'')) like '% hd %'
              or lower(coalesce(s.title,'') || ' ' || coalesce(s.detail,'')) like 'hd %'
              or lower(coalesce(s.title,'') || ' ' || coalesce(s.detail,'')) like '% hd')
            and nullif(dog.health_hd, 'Pending') is not null)
          or ((lower(coalesce(s.title,'') || ' ' || coalesce(s.detail,'')) like '%elbow%'
              or lower(coalesce(s.title,'') || ' ' || coalesce(s.detail,'')) like '% ed %')
            and nullif(dog.health_ed, 'Pending') is not null)
          or (lower(coalesce(s.title,'') || ' ' || coalesce(s.detail,'')) like '%dcm%'
            and (nullif(dog.health_dcm1, 'Pending') is not null
              or nullif(dog.health_dcm2, 'Pending') is not null))
          or (
            lower(coalesce(s.title,'') || ' ' || coalesce(s.detail,'')) not like '%holter%'
            and lower(coalesce(s.title,'') || ' ' || coalesce(s.detail,'')) not like '%hip%'
            and lower(coalesce(s.title,'') || ' ' || coalesce(s.detail,'')) not like '%elbow%'
            and lower(coalesce(s.title,'') || ' ' || coalesce(s.detail,'')) not like '%dcm%'
            and (
              nullif(dog.holter_result, 'Pending') is not null
              or nullif(dog.health_hd, 'Pending') is not null
              or nullif(dog.health_ed, 'Pending') is not null
              or nullif(dog.health_dcm1, 'Pending') is not null
            )
          )
        ) then 'done'
        else s.status
      end
    else s.status
  end as effective_status
from public.breeding_plan_steps s
left join public.heat_cycles hc on hc.id = s.heat_cycle_id
left join lateral (
  select l.actual_date
  from public.litters l
  where l.id = s.litter_id
     or (s.litter_id is null and l.heat_cycle_id = s.heat_cycle_id)
  order by l.actual_date nulls last
  limit 1
) lit on true
left join public.dogs dog
  on dog.id = coalesce(s.result_dog_id, s.dam_id, s.sire_id);

comment on view public.v_breeding_plan_steps is
  'Steps plus effective_status from linked heats, matings, litters and dogs.';

-- RLS: trainers read, admins write. No anon. No client.
alter table public.breeding_plans enable row level security;
alter table public.breeding_plan_steps enable row level security;

revoke all on public.breeding_plans from anon, public;
revoke all on public.breeding_plan_steps from anon, public;
revoke all on public.v_breeding_plan_steps from anon, public;

grant select, insert, update, delete on public.breeding_plans to authenticated;
grant select, insert, update, delete on public.breeding_plan_steps to authenticated;
grant select on public.v_breeding_plan_steps to authenticated, service_role;

create policy breeding_plans_read on public.breeding_plans
  for select using (public.is_trainer_or_above());
create policy breeding_plans_insert on public.breeding_plans
  for insert with check (public.is_admin());
create policy breeding_plans_update on public.breeding_plans
  for update using (public.is_admin()) with check (public.is_admin());
create policy breeding_plans_delete on public.breeding_plans
  for delete using (public.is_admin());

create policy breeding_plan_steps_read on public.breeding_plan_steps
  for select using (public.is_trainer_or_above());
create policy breeding_plan_steps_insert on public.breeding_plan_steps
  for insert with check (public.is_admin());
create policy breeding_plan_steps_update on public.breeding_plan_steps
  for update using (public.is_admin()) with check (public.is_admin());
create policy breeding_plan_steps_delete on public.breeding_plan_steps
  for delete using (public.is_admin());

-- Seed plan 1 from live Cleopatra / Dharka / Hailey rows.
do $$
declare
  v_plan uuid;
  v_cleo uuid;
  v_dharka uuid;
  v_hailey uuid;
  v_heat uuid;
  v_heat_start date;
  v_ovulation date;
  v_whelp date;
  v_litter uuid;
  v_mated boolean := false;
  v_step2 text;
begin
  if exists (
    select 1 from public.breeding_plans
    where name = 'Line A — Dharka succession'
  ) then
    return;
  end if;

  select id into v_cleo from public.dogs
   where name ilike '%cleopatra%' or call_name ilike 'cleo%'
   order by case when name ilike '%cleopatra%' then 0 else 1 end
   limit 1;

  select id into v_dharka from public.dogs
   where name ilike '%dhark%'
   order by case when name ilike '%dharka%' then 0 else 1 end
   limit 1;

  select id into v_hailey from public.dogs
   where name ilike '%hailey%'
   limit 1;

  if v_cleo is not null then
    select hc.id, hc.heat_start_date, hc.ovulation_date, hc.expected_whelp_date,
           hc.resulting_litter_id,
           (hc.mating_date is not null
             or exists (select 1 from public.matings m where m.heat_cycle_id = hc.id))
      into v_heat, v_heat_start, v_ovulation, v_whelp, v_litter, v_mated
      from public.heat_cycles hc
     where hc.dog_id = v_cleo
       and coalesce(hc.is_predicted, false) = false
     order by
       (hc.heat_start_date >= date '2026-08-01' and hc.heat_start_date < date '2026-09-01') desc,
       hc.heat_start_date desc
     limit 1;
  end if;

  if v_litter is null and v_heat is not null then
    select id into v_litter from public.litters
     where heat_cycle_id = v_heat
     order by created_at desc
     limit 1;
  end if;

  v_heat_start := coalesce(v_heat_start, date '2026-08-25');
  v_ovulation := coalesce(v_ovulation, date '2026-09-05');
  v_whelp := coalesce(v_whelp, date '2026-11-07');
  v_step2 := case when v_mated then 'done' else 'in_progress' end;

  insert into public.breeding_plans (name, objective, status)
  values (
    'Line A — Dharka succession',
    'Raise a son of Cleopatra and Dharka to take Dharka''s place, and keep a daughter from Hailey as the next dam.',
    'active'
  )
  returning id into v_plan;

  insert into public.breeding_plan_steps (
    plan_id, step_order, title, detail, step_type, status,
    dam_id, sire_id, litter_id, heat_cycle_id,
    expected_start, expected_end, actual_at
  ) values
  (
    v_plan, 1,
    'Cleopatra came into heat on 25 August 2026, and artificial insemination to Dharka is confirmed, with ovulation around 5 September.',
    'This is the heat that starts the succession. Success is a confirmed cycle linked to Dharka.',
    'other', 'done',
    v_cleo, v_dharka, null, v_heat,
    v_heat_start, v_ovulation, v_heat_start
  ),
  (
    v_plan, 2,
    'Carry out artificial insemination of Cleopatra to Dharka, and record the first mating date.',
    'The mating window follows ovulation. Success is at least one covering recorded on the heat.',
    'mating', v_step2,
    v_cleo, v_dharka, v_litter, v_heat,
    v_ovulation, v_ovulation + 7, case when v_mated then v_ovulation else null end
  ),
  (
    v_plan, 3,
    'Whelp Cleopatra''s litter, expected around 7 November 2026.',
    'Success is an actual whelp date on the litter record.',
    'whelp', 'planned',
    v_cleo, v_dharka, v_litter, v_heat,
    v_whelp - 3, v_whelp + 7, null
  ),
  (
    v_plan, 4,
    'At seven to eight weeks of age, choose the keep-back male from this litter, judging structure and temperament first.',
    'Success is a dog linked as the keeper on this step.',
    'select_keeper', 'planned',
    v_cleo, v_dharka, v_litter, v_heat,
    v_whelp + 49, v_whelp + 56, null
  ),
  (
    v_plan, 5,
    'Raise and title that male through 2027 and 2028 so he can succeed Dharka, who has about one breeding year left.',
    'This is hand-updated. Success is a titled male ready to replace Dharka.',
    'raise', 'planned',
    v_cleo, v_dharka, v_litter, v_heat,
    date '2027-01-01', date '2028-12-31', null
  ),
  (
    v_plan, 6,
    'From Hailey''s next litter, keep back a female puppy; her pairing will be decided later.',
    'Runs in parallel with raising the Dharka successor. Pairing is not chosen yet.',
    'breed_next', 'planned',
    v_hailey, null, null, null,
    date '2027-01-01', date '2028-12-31', null
  );
end $$;
