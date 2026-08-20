-- Client portal: breeding-stock detail only after a named litter or puppy.
-- Two doors, one gate. Deposit, enquiry, or a waitlist row without a pairing
-- grants nothing. Never revoke EXECUTE on is_admin() / is_trainer_or_above().

-- Door 1 extra path: a waitlist puppy assignment is ownership for portal RLS.
create or replace function public.dog_ids_for(p_user_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select d.id
    from public.dogs d
   where p_user_id is not null
     and (public.is_admin() or auth.uid() = p_user_id)
     and d.owner_id = p_user_id
  union
  select r.dog_id
    from public.reservations r
   where p_user_id is not null
     and (public.is_admin() or auth.uid() = p_user_id)
     and r.client_id = p_user_id
     and r.dog_id is not null
     and r.status in ('confirmed', 'completed')
  union
  select wl.assigned_dog_id
    from public.waiting_list wl
   where p_user_id is not null
     and (public.is_admin() or auth.uid() = p_user_id)
     and wl.client_id = p_user_id
     and wl.assigned_dog_id is not null
     and wl.status = 'active'
     and wl.pipeline_stage is distinct from 'withdrawn';
$$;

-- Sire/dam links for owned puppies AND for an assigned litter with no puppy yet.
create or replace function public.parent_links_for(p_user_id uuid)
returns table(parent_id uuid, role text, source text)
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(d.mother_id, l.mother_id), 'dam'::text, 'dog'::text
    from public.dogs d
    left join public.litters l on l.id = d.litter_id
   where p_user_id is not null
     and (public.is_admin() or auth.uid() = p_user_id)
     and d.id in (select public.dog_ids_for(p_user_id))
     and coalesce(d.mother_id, l.mother_id) is not null
  union
  select coalesce(d.father_id, l.father_id), 'sire'::text, 'dog'::text
    from public.dogs d
    left join public.litters l on l.id = d.litter_id
   where p_user_id is not null
     and (public.is_admin() or auth.uid() = p_user_id)
     and d.id in (select public.dog_ids_for(p_user_id))
     and coalesce(d.father_id, l.father_id) is not null
  union
  select lit.mother_id, 'dam'::text, 'litter'::text
    from public.waiting_list wl
    join public.litters lit on lit.id = wl.assigned_litter_id
   where p_user_id is not null
     and (public.is_admin() or auth.uid() = p_user_id)
     and wl.client_id = p_user_id
     and wl.assigned_litter_id is not null
     and wl.status = 'active'
     and wl.pipeline_stage is distinct from 'withdrawn'
     and lit.mother_id is not null
  union
  select lit.father_id, 'sire'::text, 'litter'::text
    from public.waiting_list wl
    join public.litters lit on lit.id = wl.assigned_litter_id
   where p_user_id is not null
     and (public.is_admin() or auth.uid() = p_user_id)
     and wl.client_id = p_user_id
     and wl.assigned_litter_id is not null
     and wl.status = 'active'
     and wl.pipeline_stage is distinct from 'withdrawn'
     and lit.father_id is not null
$$;

create or replace function public.parent_ids_for(p_user_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select distinct pl.parent_id
    from public.parent_links_for(p_user_id) pl
   where pl.parent_id is not null
$$;

create or replace function public.my_parent_links()
returns table(parent_id uuid, role text, source text)
language sql
stable
security definer
set search_path = public
as $$
  select parent_id, role, source from public.parent_links_for(auth.uid())
$$;

-- Preserve the live return type of my_dog_parent_ids() so existing RLS
-- (`id in (select my_dog_parent_ids())` vs `= any(...)`) keeps compiling.
do $$
declare
  ret text;
begin
  select pg_get_function_result(p.oid) into ret
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname = 'my_dog_parent_ids'
     and pg_get_function_identity_arguments(p.oid) = '';

  if ret is not null and ret ilike '%uuid[]%' and ret not ilike '%setof%' then
    execute $f$
      create or replace function public.my_dog_parent_ids()
      returns uuid[]
      language sql
      stable
      security definer
      set search_path = public
      as $fn$
        select coalesce(array_agg(x), '{}'::uuid[]) from public.parent_ids_for(auth.uid()) as x
      $fn$
    $f$;
  else
    execute $f$
      create or replace function public.my_dog_parent_ids()
      returns setof uuid
      language sql
      stable
      security definer
      set search_path = public
      as $fn$
        select public.parent_ids_for(auth.uid())
      $fn$
    $f$;
  end if;
end $$;

-- Litter dates for the pre-allocation screen. Names come from dogs via RLS.
create or replace function public.assigned_litter_for(p_user_id uuid)
returns table(
  litter_id uuid,
  expected_date date,
  actual_date date,
  go_home_date date,
  go_home_earliest date,
  go_home_latest date,
  go_home_weeks integer,
  mother_id uuid,
  father_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select lit.id,
         lit.expected_date,
         lit.actual_date,
         lit.go_home_date,
         lit.go_home_earliest,
         lit.go_home_latest,
         lit.go_home_weeks,
         lit.mother_id,
         lit.father_id
    from public.waiting_list wl
    join public.litters lit on lit.id = wl.assigned_litter_id
   where p_user_id is not null
     and (public.is_admin() or auth.uid() = p_user_id)
     and wl.client_id = p_user_id
     and wl.assigned_litter_id is not null
     and wl.status = 'active'
     and wl.pipeline_stage is distinct from 'withdrawn'
   order by wl.stage_updated_at desc nulls last, wl.created_at desc
   limit 1
$$;

create or replace function public.my_assigned_litter()
returns table(
  litter_id uuid,
  expected_date date,
  actual_date date,
  go_home_date date,
  go_home_earliest date,
  go_home_latest date,
  go_home_weeks integer,
  mother_id uuid,
  father_id uuid
)
language sql
stable
security definer
set search_path = public
as $$
  select * from public.assigned_litter_for(auth.uid())
$$;

-- Parent papers: health and registration only. Never category `other`.
create or replace function public.document_ids_visible_to(p_user_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select d.id
    from public.documents d
   where p_user_id is not null
     and (public.is_admin() or auth.uid() = p_user_id)
     and (
       (d.entity_type = 'client' and d.entity_id = p_user_id)
       or (d.allowed_user_ids is not null and p_user_id = any (d.allowed_user_ids))
       or d.entity_id in (select public.dog_ids_for(p_user_id))
       or (
         d.entity_type = 'dog'
         and d.entity_id in (select public.parent_ids_for(p_user_id))
         and d.category in ('dna_test', 'hip_elbow_score', 'pedigree', 'registration')
       )
       or d.client_visible is true
     );
$$;

alter table public.pedigree_ancestors enable row level security;
alter table public.health_tests enable row level security;

drop policy if exists "Clients can view committed parents pedigree" on public.pedigree_ancestors;
create policy "Clients can view committed parents pedigree"
  on public.pedigree_ancestors
  for select
  using (dog_id in (select public.parent_ids_for(auth.uid())));

drop policy if exists "Clients can view committed parents health tests" on public.health_tests;
create policy "Clients can view committed parents health tests"
  on public.health_tests
  for select
  using (dog_id in (select public.parent_ids_for(auth.uid())));

-- Push into the app they installed. Never an automatic email.
create or replace function public.notify_client_on_dog_allocation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.owner_id is not null and new.owner_id is distinct from old.owner_id then
    insert into public.notifications_log (recipient_id, type, subject, body, status)
    values (
      new.owner_id,
      'push',
      'Your puppy has been allocated',
      'Your puppy has been allocated. You can now see her parents, pedigree and progress.',
      'sent'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_client_on_dog_allocation on public.dogs;
create trigger trg_notify_client_on_dog_allocation
  after update of owner_id on public.dogs
  for each row
  execute function public.notify_client_on_dog_allocation();

grant execute on function public.parent_links_for(uuid) to authenticated, service_role;
grant execute on function public.parent_ids_for(uuid) to authenticated, service_role;
grant execute on function public.my_parent_links() to authenticated, service_role;
grant execute on function public.assigned_litter_for(uuid) to authenticated, service_role;
grant execute on function public.my_assigned_litter() to authenticated, service_role;
grant execute on function public.dog_ids_for(uuid) to authenticated, service_role;
grant execute on function public.document_ids_visible_to(uuid) to authenticated, service_role;
grant execute on function public.my_dog_parent_ids() to authenticated, service_role;

grant execute on function public.is_admin() to public, anon, authenticated, service_role;
grant execute on function public.is_trainer_or_above() to public, anon, authenticated, service_role;
