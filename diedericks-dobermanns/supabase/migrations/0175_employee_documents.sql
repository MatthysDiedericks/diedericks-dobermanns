-- 0175 — Employee as a documents.entity_type, employee file categories,
-- and admin-only access to those rows and their storage objects.
--
-- Depends on 0173_document_categories (lookup table + documents_category_fkey).
-- 0174 is already equipment_item_types. Next free number is 0175.
--
-- Do not rewrite existing documents.category, client_visible, or is_public.

-- ---------------------------------------------------------------------------
-- 0. Refuse to guess: this migration needs the 0173 lookup table.
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.document_categories') is null then
    raise exception
      '0173_document_categories has not been applied. Stop — do not guess which world this is.';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 1a. Allow employee as a document entity type (additive).
-- ---------------------------------------------------------------------------
alter table public.documents
  drop constraint if exists documents_entity_type_check;
alter table public.documents
  add constraint documents_entity_type_check
  check (entity_type = any (array[
    'dog','litter','puppy','client','application','training',
    'contract','kennel','health','show','invoice','payment','employee'
  ]));

-- ---------------------------------------------------------------------------
-- 1b. Employee document categories (lookup table, not a check constraint).
-- ---------------------------------------------------------------------------
insert into public.document_categories (key, label, entity_types, sort_order, is_active)
values
  ('employment_contract',     'Employment Contract',            array['employee'], 10, true),
  ('qualification',           'Qualification / Certificate',    array['employee'], 20, true),
  ('police_clearance',        'Police Clearance',               array['employee'], 30, true),
  ('work_permit',             'Work Permit',                    array['employee'], 40, true),
  ('banking_details',         'Banking Details',                array['employee'], 50, true),
  ('disciplinary_record',     'Disciplinary Record',            array['employee'], 60, true),
  ('performance_review',      'Performance Review',             array['employee'], 70, true),
  ('leave_form',              'Leave Form',                     array['employee'], 80, true),
  ('medical_record',          'Medical Record',                 array['employee'], 90, true),
  ('resignation_termination', 'Resignation / Termination',      array['employee'], 100, true)
on conflict (key) do nothing;

-- Re-run safety: if a key already existed without employee, append it.
update public.document_categories
   set entity_types = array_append(entity_types, 'employee')
 where key in (
   'employment_contract','qualification','police_clearance','work_permit',
   'banking_details','disciplinary_record','performance_review','leave_form',
   'medical_record','resignation_termination'
 )
   and not (entity_types @> array['employee']::text[]);

-- Existing keys: append employee, do not overwrite the array.
update public.document_categories
   set entity_types = array_append(entity_types, 'employee')
 where key = 'id_document'
   and not (entity_types @> array['employee']::text[]);

update public.document_categories
   set entity_types = array_append(entity_types, 'employee')
 where key = 'other'
   and not (entity_types @> array['employee']::text[]);

-- ---------------------------------------------------------------------------
-- 2. Employee files are admin-only. Permissive policies are OR'd, so this
--    must be RESTRICTIVE (AND'd). Covers:
--    * client_visible / allowed_user_ids / is_public catch-alls
--    * trainer-wide staff policies
--    * document_ids_visible_to (security definer) still needs its own guard
-- ---------------------------------------------------------------------------
drop policy if exists "Employee documents are admin-only" on public.documents;
create policy "Employee documents are admin-only"
  on public.documents
  as restrictive
  for all
  using (
    entity_type is distinct from 'employee'
    or (select public.is_admin())
  )
  with check (
    entity_type is distinct from 'employee'
    or (select public.is_admin())
  );

-- Storage: Auth read documents lets is_trainer_or_above() read the whole
-- documents bucket, and any authenticated client can read dog/ and kennel/.
-- Path prefix employee/ must not ride those permissive rules.
drop policy if exists "Employee documents storage admin only" on storage.objects;
create policy "Employee documents storage admin only"
  on storage.objects
  as restrictive
  for all
  using (
    bucket_id is distinct from 'documents'
    or (storage.foldername(name))[1] is distinct from 'employee'
    or (select public.is_admin())
  )
  with check (
    bucket_id is distinct from 'documents'
    or (storage.foldername(name))[1] is distinct from 'employee'
    or (select public.is_admin())
  );

-- Security definer: bypasses table RLS, including the restrictive policy above.
-- Close the client_visible / allowed_user_ids branches for employee rows.
create or replace function public.document_ids_visible_to(p_user_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path to 'public'
as $$
  select d.id
    from public.documents d
   where p_user_id is not null
     and d.entity_type is distinct from 'employee'
     and (public.is_admin() or p_user_id in (select public.my_client_ids()))
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
     )
$$;

grant execute on function public.document_ids_visible_to(uuid) to authenticated, service_role;

notify pgrst, 'reload schema';
