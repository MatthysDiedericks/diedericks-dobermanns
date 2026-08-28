-- Portal preview: same visibility helpers the portal uses, parameterised by
-- user id so an admin can read a client's view without impersonating them.
-- Never revoke EXECUTE on is_admin() or is_trainer_or_above().

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
     and r.status in ('confirmed', 'completed');
$$;

-- Keep my_dog_ids() as a thin wrapper so RLS policies that call it stay
-- on the same ownership definition as dog_ids_for().
do $$
declare
  ret text;
begin
  select pg_get_function_result(p.oid) into ret
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname = 'my_dog_ids'
     and pg_get_function_identity_arguments(p.oid) = '';

  if ret is not null and ret ilike '%uuid[]%' and ret not ilike '%setof%' then
    execute $f$
      create or replace function public.my_dog_ids()
      returns uuid[]
      language sql
      stable
      security definer
      set search_path = public
      as $fn$
        select coalesce(array_agg(x), '{}'::uuid[]) from public.dog_ids_for(auth.uid()) as x
      $fn$
    $f$;
  else
    execute $f$
      create or replace function public.my_dog_ids()
      returns setof uuid
      language sql
      stable
      security definer
      set search_path = public
      as $fn$
        select public.dog_ids_for(auth.uid())
      $fn$
    $f$;
  end if;
end $$;

create or replace function public.dog_lineage_for(p_user_id uuid, p_dog_id uuid)
returns table(parent_id uuid, role text)
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(d.mother_id, l.mother_id), 'dam'
    from public.dogs d
    left join public.litters l on l.id = d.litter_id
   where d.id = p_dog_id
     and d.id in (select public.dog_ids_for(p_user_id))
     and coalesce(d.mother_id, l.mother_id) is not null
  union all
  select coalesce(d.father_id, l.father_id), 'sire'
    from public.dogs d
    left join public.litters l on l.id = d.litter_id
   where d.id = p_dog_id
     and d.id in (select public.dog_ids_for(p_user_id))
     and coalesce(d.father_id, l.father_id) is not null
$$;

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
       or exists (
         select 1
           from public.dog_ids_for(p_user_id) as owned(dog_id)
           join lateral public.dog_lineage_for(p_user_id, owned.dog_id) lin on true
          where lin.parent_id = d.entity_id
       )
       or d.client_visible is true
     );
$$;

create or replace function public.log_portal_preview(p_client_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_email text;
  v_role text;
  v_client_name text;
  v_is_client boolean;
begin
  if not public.is_admin() then
    raise exception 'not authorized' using errcode = '42501';
  end if;
  if p_client_id is null then
    raise exception 'client required';
  end if;

  select u.email, u.role into v_email, v_role
    from public.users u
   where u.id = v_actor;

  select u.full_name, true into v_client_name, v_is_client
    from public.users u
   where u.id = p_client_id and u.role = 'client';

  if not coalesce(v_is_client, false) then
    raise exception 'client not found';
  end if;

  insert into public.audit_log (
    table_name, record_id, action, actor_id, actor_email, actor_role,
    changed_fields, old_values, new_values
  ) values (
    'users',
    p_client_id::text,
    'preview',
    v_actor,
    v_email,
    v_role,
    array['portal_preview'],
    null,
    jsonb_build_object(
      'event', 'portal_preview',
      'client_id', p_client_id,
      'client_name', v_client_name
    )
  );
end;
$$;

grant execute on function public.dog_ids_for(uuid) to authenticated, service_role;
grant execute on function public.dog_lineage_for(uuid, uuid) to authenticated, service_role;
grant execute on function public.document_ids_visible_to(uuid) to authenticated, service_role;
grant execute on function public.log_portal_preview(uuid) to authenticated, service_role;

-- Grant, never revoke. Used inside RLS — revoking these took the site down in July.
grant execute on function public.is_admin() to public, anon, authenticated, service_role;
grant execute on function public.is_trainer_or_above() to public, anon, authenticated, service_role;
