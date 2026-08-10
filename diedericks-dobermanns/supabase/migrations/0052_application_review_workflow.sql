-- ============================================================================
-- Application review workflow.
--
-- 1. applications.status gains 'info_requested' — the admin can ask the
--    applicant for more detail without approving or rejecting them.
-- 2. notifications_log.type gains the workflow types. The immediate new
--    application alert had no allowed type of its own, and every applicant
--    email in the new workflow must be auditable.
-- 3. reference_code is back-filled for the rows submitted before the code was
--    persisted, using the same DD- + first 8 characters of the id rule the
--    applicant was shown on submission.
-- 4. application_events — the review timeline (what changed, when, by whom).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Applications — new review status
-- ---------------------------------------------------------------------------
alter table public.applications drop constraint if exists applications_status_check;
alter table public.applications add constraint applications_status_check
  check (status in (
    'submitted', 'under_review', 'info_requested', 'approved', 'rejected', 'waitlisted'
  ));

-- ---------------------------------------------------------------------------
-- 2. notifications_log — workflow alert types
-- ---------------------------------------------------------------------------
alter table public.notifications_log drop constraint if exists notifications_log_type_check;
alter table public.notifications_log add constraint notifications_log_type_check
  check (type in (
    'push', 'email', 'whatsapp', 'application_confirmation', 'document_expiry',
    'application_received', 'application_reminder', 'new_application',
    'application_info_requested', 'application_approved', 'application_rejected',
    'quote_sent'
  ));

-- ---------------------------------------------------------------------------
-- 3. Reference codes
-- ---------------------------------------------------------------------------
update public.applications
   set reference_code = 'DD-' || upper(left(id::text, 8))
 where reference_code is null;

-- Deliberately not unique: a collision on the first 8 hex characters of a uuid
-- must never be able to block a public application submission.
create index if not exists idx_applications_reference_code
  on public.applications (reference_code);

-- ---------------------------------------------------------------------------
-- 4. Review timeline
-- ---------------------------------------------------------------------------
create table if not exists public.application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete cascade,
  event_type text not null check (event_type in (
    'submitted', 'status_change', 'info_requested', 'note', 'email_sent', 'quote_created'
  )),
  from_status text,
  to_status text,
  -- Admin-facing summary only. Never the full body of an applicant email.
  message text,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_application_events_application
  on public.application_events (application_id, created_at desc);

alter table public.application_events enable row level security;

create policy "Admins can view application events" on public.application_events
  for select using (public.is_admin());

create policy "Admins can write application events" on public.application_events
  for insert with check (public.is_admin());
