-- 0169 — Protection dog listing: shared skill library + per-dog ticks.
-- Seed disciplines only. Matt fills the skills himself.

-- ---------------------------------------------------------------------------
-- dogs: three listing columns
-- ---------------------------------------------------------------------------
alter table public.dogs
  add column if not exists training_exclusions text,
  add column if not exists scenario_exclusions text,
  add column if not exists temperament jsonb;

-- ---------------------------------------------------------------------------
-- skill_library — global, shared by every dog
-- ---------------------------------------------------------------------------
create table if not exists public.skill_library (
  id                  uuid primary key default gen_random_uuid(),
  discipline          text not null,
  label               text not null,
  detail              text,
  default_conditions  text[] not null default '{}',
  sort_order          int not null default 0,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now()
);

create index if not exists skill_library_discipline_sort_idx
  on public.skill_library (discipline, sort_order);

-- ---------------------------------------------------------------------------
-- dog_skills — what one dog actually does (copied from the library on tick)
-- ---------------------------------------------------------------------------
create table if not exists public.dog_skills (
  id           uuid primary key default gen_random_uuid(),
  dog_id       uuid not null references public.dogs(id) on delete cascade,
  library_id   uuid references public.skill_library(id) on delete set null,
  discipline   text not null,
  label        text not null,
  detail       text,
  conditions   text[] not null default '{}',
  level        text,
  sort_order   int not null default 0,
  is_public    boolean not null default true,
  created_at   timestamptz not null default now(),
  constraint dog_skills_level_check
    check (level is null or level in ('building', 'solid', 'proofed'))
);

create index if not exists dog_skills_dog_sort_idx
  on public.dog_skills (dog_id, sort_order);

-- ---------------------------------------------------------------------------
-- Seed the six disciplines as empty-label anchors. Not skills — the builder
-- hides a blank label. Matt adds real skills from the first dog he builds.
-- ---------------------------------------------------------------------------
insert into public.skill_library (discipline, label, sort_order)
select v.discipline, '', v.sort_order
from (values
  ('obedience',     0),
  ('protection',    1),
  ('tracking',      2),
  ('environmental', 3),
  ('household',     4),
  ('scenario',      5)
) as v(discipline, sort_order)
where not exists (
  select 1 from public.skill_library s where s.discipline = v.discipline
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.skill_library enable row level security;
alter table public.dog_skills    enable row level security;

drop policy if exists skill_library_select_active on public.skill_library;
create policy skill_library_select_active on public.skill_library
  for select to anon, authenticated
  using (is_active = true);

drop policy if exists skill_library_select_admin on public.skill_library;
create policy skill_library_select_admin on public.skill_library
  for select to authenticated
  using ((select public.is_admin()));

drop policy if exists skill_library_insert_admin on public.skill_library;
create policy skill_library_insert_admin on public.skill_library
  for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists skill_library_update_admin on public.skill_library;
create policy skill_library_update_admin on public.skill_library
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists skill_library_delete_admin on public.skill_library;
create policy skill_library_delete_admin on public.skill_library
  for delete to authenticated
  using ((select public.is_admin()));

drop policy if exists dog_skills_select_public on public.dog_skills;
create policy dog_skills_select_public on public.dog_skills
  for select to anon, authenticated
  using (
    is_public = true
    and exists (
      select 1 from public.dogs d
      where d.id = dog_skills.dog_id
        and d.is_public = true
    )
  );

drop policy if exists dog_skills_select_admin on public.dog_skills;
create policy dog_skills_select_admin on public.dog_skills
  for select to authenticated
  using ((select public.is_admin()));

drop policy if exists dog_skills_insert_admin on public.dog_skills;
create policy dog_skills_insert_admin on public.dog_skills
  for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists dog_skills_update_admin on public.dog_skills;
create policy dog_skills_update_admin on public.dog_skills
  for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

drop policy if exists dog_skills_delete_admin on public.dog_skills;
create policy dog_skills_delete_admin on public.dog_skills
  for delete to authenticated
  using ((select public.is_admin()));

revoke all on table public.skill_library from anon, public;
revoke all on table public.dog_skills    from anon, public;
grant select on table public.skill_library to anon, authenticated;
grant select on table public.dog_skills    to anon, authenticated;
grant insert, update, delete on table public.skill_library to authenticated;
grant insert, update, delete on table public.dog_skills    to authenticated;
grant all on table public.skill_library to service_role;
grant all on table public.dog_skills    to service_role;

select public.enable_audit('skill_library');
select public.enable_audit('dog_skills');
