-- 0179_application_merged_into.sql
-- Deduplicating by DELETE breaks every alert email already sent. Keep a
-- tombstone instead: the loser stays, archived, pointing at the survivor,
-- so an old link redirects rather than 404s.

alter table public.applications
  add column if not exists merged_into_application_id uuid
    references public.applications(id) on delete set null;

create index if not exists applications_merged_into_idx
  on public.applications (merged_into_application_id)
  where merged_into_application_id is not null;

notify pgrst, 'reload schema';
