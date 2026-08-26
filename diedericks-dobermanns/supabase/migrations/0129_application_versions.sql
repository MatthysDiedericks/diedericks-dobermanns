-- 0129 — Application versions schema, table and backfill.
-- RPCs and triggers live in 0130. Never a cancelled status.

-- 1. Status: changes_pending.
alter table public.applications drop constraint if exists applications_status_check;
alter table public.applications add constraint applications_status_check
  check (status in (
    'submitted', 'under_review', 'info_requested', 'approved', 'rejected',
    'waitlisted', 'changes_pending'
  ));

alter table public.applications
  add column if not exists approved_version_number integer;

comment on column public.applications.approved_version_number is
  'Version Matt last approved. Re-approval stamps a new number without resetting reviewed_at.';

-- 2. Versions table
create table if not exists public.application_versions (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications (id) on delete restrict,
  version_number integer not null check (version_number >= 1),
  snapshot jsonb not null,
  changed_by uuid references public.users (id) on delete set null,
  changed_at timestamptz not null default now(),
  change_reason text,
  tier_touched text not null check (tier_touched in (
    'free', 'reapproval', 'initial', 'reapproved'
  )),
  unique (application_id, version_number)
);

create index if not exists application_versions_app_idx
  on public.application_versions (application_id, version_number desc);

comment on table public.application_versions is
  'Immutable snapshots. applications is the live view; this table is the record.';

alter table public.application_versions enable row level security;

create policy "Applicant can read own application versions"
  on public.application_versions for select
  using (
    exists (
      select 1 from public.applications a
      where a.id = application_versions.application_id
        and a.user_id = auth.uid()
    )
  );

create policy "Admins can read all application versions"
  on public.application_versions for select
  using (public.is_admin());

-- Writes go through SECURITY DEFINER RPCs only.
create policy "Admins can insert application versions"
  on public.application_versions for insert
  with check (public.is_admin());

grant select on public.application_versions to authenticated, service_role;

select public.enable_audit('application_versions');

-- 3. Timeline event types
alter table public.application_events
  drop constraint if exists application_events_event_type_check;
alter table public.application_events
  add constraint application_events_event_type_check
  check (event_type in (
    'submitted', 'status_change', 'info_requested', 'note', 'email_sent',
    'quote_created', 'archived', 'restored', 'id_check_override',
    'applicant_edit', 'reapproved'
  ));

-- 4. Snapshot existing rows as version 1 so nothing starts with a blank history.
insert into public.application_versions (
  application_id, version_number, snapshot, changed_by, changed_at, change_reason, tier_touched
)
select
  a.id,
  1,
  to_jsonb(a),
  a.user_id,
  a.created_at,
  'Initial snapshot',
  'initial'
from public.applications a
where not exists (
  select 1 from public.application_versions v
  where v.application_id = a.id and v.version_number = 1
);

update public.applications a
   set approved_version_number = 1
 where a.status in ('approved', 'changes_pending')
   and a.approved_version_number is null;

-- Field-tier helper — same lists as src/lib/applications/fieldTiers.ts
create or replace function public.application_field_tier(p_field text)
returns text
language sql
immutable
as $$
  select case
    when p_field in (
      'phone', 'email', 'address', 'city', 'province', 'country',
      'occupation', 'employer', 'instagram_handle', 'facebook_profile',
      'vet_name', 'vet_phone', 'personal_reference_name',
      'personal_reference_phone', 'special_requests'
    ) then 'free'
    when p_field in (
      'dog_interest', 'specific_dog_id', 'litter_interest_id',
      'preferred_sex', 'preferred_colour', 'tail_preference',
      'preferred_timeline', 'budget_range', 'purpose',
      'security_requirements', 'training_planned'
    ) then 'reapproval'
    else null
  end
$$;
