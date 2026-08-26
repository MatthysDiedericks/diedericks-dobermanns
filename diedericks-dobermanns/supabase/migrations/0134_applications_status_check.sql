-- Returning buyers: link a new application to the previous one.
alter table public.applications
  add column if not exists previous_application_id uuid references public.applications(id);

create index if not exists idx_applications_previous
  on public.applications (previous_application_id)
  where previous_application_id is not null;

-- Status values actually in use. Existing rows that fall outside are left
-- untouched only if none exist — the check is added after a no-op coerce of
-- empty string, then unknown values would fail the migration so we can see them.
do $$
declare
  bad text;
begin
  select string_agg(distinct status, ', ')
    into bad
    from public.applications
   where status is not null
     and status not in (
       'submitted',
       'under_review',
       'info_requested',
       'approved',
       'changes_pending',
       'rejected',
       'waitlisted'
     );
  if bad is not null then
    raise exception 'applications.status has unexpected values: %', bad;
  end if;
end $$;

alter table public.applications drop constraint if exists applications_status_check;
alter table public.applications
  add constraint applications_status_check
  check (
    status is null
    or status in (
      'submitted',
      'under_review',
      'info_requested',
      'approved',
      'changes_pending',
      'rejected',
      'waitlisted'
    )
  );

-- Returning buyers submit a new row as themselves. Additive — existing
-- policies are unchanged. Nothing is sent automatically.
drop policy if exists "clients_insert_own_applications" on public.applications;
create policy "clients_insert_own_applications" on public.applications
  for insert with check (user_id = auth.uid());
