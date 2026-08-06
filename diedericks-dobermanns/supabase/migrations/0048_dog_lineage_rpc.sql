-- Resolves ONE dog's sire/dam ids (with role), for the portal lineage section.
--
-- Why an RPC and not a plain join: only 2 of 29 litters are `is_public`, and
-- `litters` RLS otherwise requires `is_admin()`. A client-scoped join of
-- `dogs -> litters` (the coalesce(dog, litter) fallback) would silently
-- return no litter row — and therefore no parent — for the other 27. This
-- mirrors `my_dog_parent_ids()` (same coalesce logic, same SECURITY DEFINER
-- bypass of `litters` RLS) but scoped to a single dog and labelled sire/dam,
-- and re-checks `my_dog_ids()` internally so a client cannot pass an
-- arbitrary dog id belonging to someone else and still get lineage back.
create or replace function public.my_dog_lineage(target_dog_id uuid)
returns table(parent_id uuid, role text)
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(d.mother_id, l.mother_id), 'dam'
    from dogs d
    left join litters l on l.id = d.litter_id
   where d.id = target_dog_id
     and d.id in (select my_dog_ids())
     and coalesce(d.mother_id, l.mother_id) is not null
  union all
  select coalesce(d.father_id, l.father_id), 'sire'
    from dogs d
    left join litters l on l.id = d.litter_id
   where d.id = target_dog_id
     and d.id in (select my_dog_ids())
     and coalesce(d.father_id, l.father_id) is not null
$$;
