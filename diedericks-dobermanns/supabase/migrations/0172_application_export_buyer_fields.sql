-- 0172_application_export_buyer_fields.sql
-- The apply form has written these three fields since 8 Sep 2026 but the columns
-- were never created, so PostgREST rejected every insert with PGRST204 and no
-- application was saved for two days. Additive only.
-- Form values (schema.ts / Step1Personal): sa | sadc | international — not local.

alter table public.applications
  add column if not exists buyer_location_type          text,
  add column if not exists export_terms_acknowledged    boolean not null default false,
  add column if not exists export_terms_acknowledged_at timestamptz;

alter table public.applications
  drop constraint if exists applications_buyer_location_type_check;
alter table public.applications
  add constraint applications_buyer_location_type_check
  check (buyer_location_type is null
         or buyer_location_type in ('sa','sadc','international'));
