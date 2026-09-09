-- Buyer location on applications. Three columns only — no new tables.

alter table public.applications
  add column if not exists buyer_location_type text,
  add column if not exists export_terms_acknowledged boolean not null default false,
  add column if not exists export_terms_acknowledged_at timestamptz;

alter table public.applications
  drop constraint if exists applications_buyer_location_type_check;
alter table public.applications
  add constraint applications_buyer_location_type_check
  check (
    buyer_location_type is null
    or buyer_location_type in ('sa', 'sadc', 'international')
  );

update public.applications
set buyer_location_type = case
  when lower(trim(country)) in ('south africa', 'rsa', 'za') then 'sa'
  when lower(trim(country)) in (
    'angola', 'botswana', 'comoros', 'dr congo',
    'democratic republic of the congo', 'democratic republic of congo',
    'eswatini', 'swaziland', 'lesotho', 'madagascar', 'malawi', 'mauritius',
    'mozambique', 'namibia', 'seychelles', 'tanzania',
    'united republic of tanzania', 'zambia', 'zimbabwe'
  ) then 'sadc'
  when country is not null and btrim(country) <> '' then 'international'
  else null
end
where buyer_location_type is null;
