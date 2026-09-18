-- 0182 — Profitability foundation (Stage A)
--
-- 1. Puppy survival outcome on dogs (not a separate litter_outcomes table).
--    Every puppy is already a dogs row; litter counts and dog-days both read
--    from there. A side table would split identity and drift.
-- 2. expenses.allocation_type: general was the unused default (almost every
--    row). Those rows enter the shared kennel pool. Direct litter/dog tags
--    stay. Matt can pull obvious directs out from the expenses screen.
-- 3. Dog-day multipliers and dam amortisation live in app_settings.

-- ---------------------------------------------------------------------------
-- 1. Puppy outcome
-- ---------------------------------------------------------------------------
alter table public.dogs
  add column if not exists outcome text not null default 'live'
    check (outcome in ('live', 'stillborn', 'died_early')),
  add column if not exists outcome_date date,
  add column if not exists outcome_note text;

comment on column public.dogs.outcome is
  'Whelping survival: live, stillborn, or died_early. Independent of dogs.status so we do not add stillborn to dogs_status_check.';
comment on column public.dogs.outcome_date is
  'Date of stillbirth or early death. Stillborn defaults to date_of_birth.';
comment on column public.dogs.outcome_note is
  'Optional note on a stillbirth or early death.';

create or replace function public.puppy_is_dead(
  p_status text,
  p_outcome text,
  p_deceased_at date
) returns boolean
language sql
immutable
as $$
  select
    coalesce(p_status, '') in ('deceased', 'stillborn')
    or coalesce(p_outcome, 'live') in ('stillborn', 'died_early')
    or p_deceased_at is not null;
$$;

-- Keep litter sex / deceased counts honest when outcome is set even if status
-- was left as available (the app writes deceased for non-live outcomes).
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
          where sex = 'male' and not public.puppy_is_dead(status, outcome, deceased_at)
        )::int as males,
        count(*) filter (
          where sex = 'female' and not public.puppy_is_dead(status, outcome, deceased_at)
        )::int as females,
        count(*) filter (
          where public.puppy_is_dead(status, outcome, deceased_at)
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
        where sex = 'male' and not public.puppy_is_dead(status, outcome, deceased_at)
      )::int as males,
      count(*) filter (
        where sex = 'female' and not public.puppy_is_dead(status, outcome, deceased_at)
      )::int as females,
      count(*) filter (
        where public.puppy_is_dead(status, outcome, deceased_at)
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
  after insert or delete or update of litter_id, sex, status, outcome, deceased_at
  on public.dogs
  for each row
  execute function public.recalc_litter_puppy_counts();

-- ---------------------------------------------------------------------------
-- 2. Expense allocation_type: general → shared
-- ---------------------------------------------------------------------------
-- Drop the old check first — it only allows general/dog/litter, so the
-- rewrite to shared cannot run while it is in place.
alter table public.expenses drop constraint if exists expenses_allocation_type_check;

alter table public.expenses
  alter column allocation_type set default 'shared';

do $$
declare
  v_total int;
  v_general int;
  v_dog int;
  v_litter int;
  v_shared int;
  v_other int;
begin
  select count(*) into v_total from public.expenses;
  select count(*) into v_general from public.expenses where allocation_type = 'general';
  select count(*) into v_dog from public.expenses where allocation_type = 'dog';
  select count(*) into v_litter from public.expenses where allocation_type = 'litter';
  select count(*) into v_shared from public.expenses where allocation_type = 'shared';
  v_other := v_total - v_general - v_dog - v_litter - v_shared;

  raise notice '0182 BEFORE allocation_type counts: total=% general=% dog=% litter=% shared=% other=%',
    v_total, v_general, v_dog, v_litter, v_shared, v_other;

  update public.expenses
  set allocation_type = 'shared'
  where allocation_type = 'general';

  select count(*) into v_total from public.expenses;
  select count(*) into v_general from public.expenses where allocation_type = 'general';
  select count(*) into v_dog from public.expenses where allocation_type = 'dog';
  select count(*) into v_litter from public.expenses where allocation_type = 'litter';
  select count(*) into v_shared from public.expenses where allocation_type = 'shared';
  v_other := v_total - v_general - v_dog - v_litter - v_shared;

  raise notice '0182 AFTER allocation_type counts: total=% general=% dog=% litter=% shared=% other=%',
    v_total, v_general, v_dog, v_litter, v_shared, v_other;
end $$;

alter table public.expenses
  add constraint expenses_allocation_type_check
  check (allocation_type in ('shared', 'dog', 'litter'));

comment on column public.expenses.allocation_type is
  'shared = kennel overhead, allocated by weighted dog-days. litter + litter_id = direct to that litter. dog + dog_id = direct to that dog.';

-- ---------------------------------------------------------------------------
-- 3. Allocation settings
-- ---------------------------------------------------------------------------
insert into public.app_settings (key, value, description) values
  (
    'dog_days_nursing_multiplier',
    '2.0',
    'Dam weighted dog-days while nursing. 2.0 means she counts as two adults. Extra above 1.0 is attributed to the litter.'
  ),
  (
    'dog_days_puppy_weight',
    '0.5',
    'A puppy dog-day as a fraction of an adult dog-day.'
  ),
  (
    'dam_expected_productive_litters',
    '5',
    'Amortise a dam purchase cost across this many litters. Unamortised remainder is shown separately if she retires early.'
  )
on conflict (key) do nothing;

notify pgrst, 'reload schema';
