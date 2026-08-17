-- 0083 — ID / passport format checks on applications.
-- A matching checksum is not identity verification. Status is a flag, never a
-- submission block. date_of_birth stays text so ambiguous historic values are
-- not coerced; new submissions store ISO dates (YYYY-MM-DD).

alter table public.applications
  add column if not exists id_type text
    check (id_type is null or id_type in ('sa_id','passport','other_national_id')),
  add column if not exists id_check_status text
    check (id_check_status is null or id_check_status in ('passed','failed','not_checked','manual_override')),
  add column if not exists id_check_note text;

alter table public.contacts
  add column if not exists id_type text,
  add column if not exists id_check_status text;

create index if not exists applications_id_check_status_idx
  on public.applications (id_check_status)
  where id_check_status = 'failed';

comment on column public.applications.id_check_status is
  'Format check only — never identity verification. failed flags for review; it does not block submit.';

comment on column public.applications.date_of_birth is
  'ISO date (YYYY-MM-DD) for new rows. Historic free-text left unchanged when ambiguous.';

alter table public.application_events
  drop constraint if exists application_events_event_type_check;
alter table public.application_events
  add constraint application_events_event_type_check
  check (event_type in (
    'submitted', 'status_change', 'info_requested', 'note', 'email_sent',
    'quote_created', 'archived', 'restored', 'id_check_override'
  ));
