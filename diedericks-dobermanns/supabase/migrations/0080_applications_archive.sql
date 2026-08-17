-- 0080 — Archive applications instead of deleting them.
-- Quotes, waiting-list rows and reservations keep their FK; the application
-- stays as evidence of the terms the buyer agreed to.

alter table public.applications
  add column if not exists archived_at timestamptz,
  add column if not exists archived_by uuid references public.users(id),
  add column if not exists archived_reason text;

create index if not exists applications_active_idx
  on public.applications(created_at desc) where archived_at is null;

comment on column public.applications.archived_at is
  'When set, the application is filed away. Never a hard delete.';
comment on column public.applications.archived_reason is
  'Required when archiving — why this left the active list.';

-- Timeline: archive / restore are notes on the existing event types, plus
-- dedicated values so the detail page can label them.
alter table public.application_events
  drop constraint if exists application_events_event_type_check;
alter table public.application_events
  add constraint application_events_event_type_check
  check (event_type in (
    'submitted', 'status_change', 'info_requested', 'note', 'email_sent',
    'quote_created', 'archived', 'restored'
  ));

-- Evidentiary table — archive is an UPDATE that must be auditable.
select public.enable_audit('applications');
