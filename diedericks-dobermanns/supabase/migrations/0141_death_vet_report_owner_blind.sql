-- Death vet reports: entity_type=dog, client_visible=false must stay admin-only.
-- document_ids_visible_to previously returned every document on an owned dog,
-- so the owner who uploaded a death report could read it back. Close that.

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
       or (
         d.entity_id in (select public.dog_ids_for(p_user_id))
         and d.client_visible is true
       )
       or (
         d.entity_type = 'dog'
         and d.entity_id in (select public.parent_ids_for(p_user_id))
         and d.category in ('dna_test', 'hip_elbow_score', 'pedigree', 'registration')
       )
       or (
         d.client_visible is true
         and d.entity_type is distinct from 'dog'
       )
     );
$$;
