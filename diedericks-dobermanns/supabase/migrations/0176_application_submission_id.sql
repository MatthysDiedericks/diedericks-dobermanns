-- 0176_application_submission_id.sql
-- A client-generated id per filled-in form. Re-posting the same form returns
-- the original reference instead of creating a duplicate. Five duplicate
-- applications were created by one applicant on 10 Sep 2026 because the site
-- reported failure after a successful insert.
--
-- 0175 is already employee_documents (on disk, both repos). This is 0176.

alter table public.applications
  add column if not exists submission_id uuid;

create unique index if not exists applications_submission_id_key
  on public.applications (submission_id)
  where submission_id is not null;

notify pgrst, 'reload schema';
