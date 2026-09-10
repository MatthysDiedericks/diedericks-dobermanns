-- 0173 — Document categories lookup table.
--
-- 0165 was already used (delivery_confirmed_by_client_alert). Next free
-- number as of 10 Sep 2026 is 0173.
--
-- The documents_category_check constraint, website string literals, and the
-- app's Title Case picker lists could drift independently. A real applicant
-- was rejected because the website wrote "Application Supporting Doc" while
-- the constraint only accepts application_supporting_doc.
--
-- One lookup table. Labels live next to keys. A foreign key makes a wrong
-- value impossible. Both platforms read this table; adding a category is
-- one insert.
--
-- Do not rewrite existing documents.category values.

-- ---------------------------------------------------------------------------
-- 1. Lookup table
-- ---------------------------------------------------------------------------
create table if not exists public.document_categories (
  key          text primary key,
  label        text not null,
  entity_types text[] not null default '{}',
  sort_order   integer not null default 100,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now()
);

alter table public.document_categories enable row level security;

drop policy if exists "Anyone signed in can read document categories"
  on public.document_categories;
create policy "Anyone signed in can read document categories"
on public.document_categories for select
using (true);

drop policy if exists "Admins manage document categories"
  on public.document_categories;
create policy "Admins manage document categories"
on public.document_categories for all
using ((select public.is_admin())) with check ((select public.is_admin()));

grant select on public.document_categories to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Seed every key currently in documents_category_check, plus
--    parent_health_records (offered by the app, missing from the constraint).
--    application_supporting is kept inactive so existing rows stay valid.
-- ---------------------------------------------------------------------------
insert into public.document_categories (key, label, entity_types, sort_order, is_active)
values
  ('pedigree',                    'Pedigree',                    array['dog','puppy'], 10, true),
  ('registration',                'Registration',                array['dog','puppy'], 20, true),
  ('microchip',                   'Microchip',                   array['dog','puppy','health'], 30, true),
  ('dna_test',                    'DNA Test',                    array['dog','puppy'], 40, true),
  ('health_certificate',          'Health Certificate',          array['dog','puppy','health'], 50, true),
  ('vaccination_record',          'Vaccination Record',          array['dog','puppy','health'], 60, true),
  ('hip_elbow_score',             'Hip/Elbow Score',             array['dog','puppy'], 70, true),
  ('eye_test',                    'Eye Test',                    array['dog','puppy'], 80, true),
  ('heart_test',                  'Heart Test',                  array['dog','puppy'], 90, true),
  ('parent_health_records',       'Parent Health Records',       array['dog','client'], 100, true),
  ('import_permit',               'Import Permit',               array['dog','puppy'], 110, true),
  ('export_permit',               'Export Permit',               array['dog','puppy'], 120, true),
  ('insurance',                   'Insurance',                   array['dog','puppy'], 130, true),
  ('show_certificate',            'Show Certificate',            array['dog','puppy','show'], 140, true),
  ('training_certificate',        'Training Certificate',        array['dog','puppy','training'], 150, true),
  ('litter_registration',         'Litter Registration',         array['litter'], 10, true),
  ('stud_agreement',              'Stud Agreement',              array['litter'], 20, true),
  ('whelping_record',             'Whelping Record',             array['litter'], 30, true),
  ('puppy_birth_certificate',     'Puppy Birth Certificate',     array['litter','dog','puppy'], 40, true),
  ('purchase_agreement',          'Purchase Agreement',          array['client'], 10, true),
  ('puppy_guarantee',             'Puppy Guarantee',             array['client'], 20, true),
  ('health_warranty',             'Health Warranty',             array['client'], 30, true),
  ('transfer_of_ownership',       'Transfer of Ownership',       array['client','dog','puppy'], 40, true),
  ('nda',                         'NDA',                         array['client'], 50, true),
  ('application_supporting_doc',  'Application Supporting Doc',  array['application'], 10, true),
  ('application_supporting',      'Application Supporting Doc (legacy)', array['application'], 11, false),
  ('vet_reference',               'Vet Reference',               array['application'], 20, true),
  ('id_document',                 'ID Document',                 array['application'], 30, true),
  ('training_report',             'Training Report',             array['training'], 10, true),
  ('completion_certificate',      'Completion Certificate',      array['training'], 20, true),
  ('psa_certificate',             'PSA Certificate',             array['training'], 30, true),
  ('kennel_licence',              'Kennel Licence',              array['kennel'], 10, true),
  ('breed_society_registration',  'Breed Society Registration',  array['kennel'], 20, true),
  ('vet_practice_agreement',      'Vet Practice Agreement',      array['kennel'], 30, true),
  ('proof_of_payment',            'Proof of Payment',            array['client','invoice','payment'], 10, true),
  ('other',                       'Other',                       array['dog','litter','puppy','client','application','training','contract','kennel','health','show','invoice','payment'], 1000, true)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Refuse to add the foreign key if any stored category is missing.
--    Expect zero rows. Do not invent keys to make this pass.
-- ---------------------------------------------------------------------------
do $$
declare
  orphan text;
begin
  select string_agg(q.category, ', ' order by q.category)
    into orphan
  from (
    select distinct d.category
    from public.documents d
    left join public.document_categories c on c.key = d.category
    where d.category is not null and c.key is null
  ) q;

  if orphan is not null then
    raise exception
      'documents.category values missing from document_categories: %. Stop — do not invent keys.',
      orphan;
  end if;
end $$;

alter table public.documents drop constraint if exists documents_category_check;

alter table public.documents
  drop constraint if exists documents_category_fkey;
alter table public.documents
  add constraint documents_category_fkey
  foreign key (category) references public.document_categories(key);

-- ---------------------------------------------------------------------------
-- 4. PostgREST caches the schema. A new table is invisible to the API until
--    the cache reloads — that is what produced PGRST204 and two days of
--    failed applications on 8-10 Sep 2026. Do not remove this line.
-- ---------------------------------------------------------------------------
notify pgrst, 'reload schema';
