-- dog_lineage_for was specified in 0107 for portal preview. Recreate it here
-- so an allocated puppy's sire/dam resolve through the same dog_ids_for gate.
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

grant execute on function public.dog_lineage_for(uuid, uuid) to authenticated, service_role;
grant execute on function public.is_admin() to public, anon, authenticated, service_role;
grant execute on function public.is_trainer_or_above() to public, anon, authenticated, service_role;
