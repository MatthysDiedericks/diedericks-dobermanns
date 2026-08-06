-- Dog allocation + website portal parity.
--
-- Allocation itself (dogs.owner_id, reservations) already has full RLS from
-- earlier migrations (admins manage, owners/reservers read their own dog).
-- This migration closes two gaps that block the *lineage* feature from
-- working once a dog is allocated:
--
-- 1. `my_dog_parent_ids()` already exists and already scopes the `documents`
--    RLS policy for parent certificates. But nothing granted the equivalent
--    read on the parent DOG ROW itself (name, photo, hip/elbow/dcm columns) or
--    its media — a client could see their parent's paperwork but not the
--    parent's name or photo unless that parent happened to also be a public
--    kennel dog. 11/12 parent dogs in the live data are public, but the
--    feature must work for the 12th too. Additive only — does not touch or
--    weaken any existing policy.
-- 2. Notification "unread" state has no persistence today (the mobile app's
--    unread badge is local-only, reset every session). The website portal
--    needs a real mark-as-read action, so we add the column + a narrow
--    self-service update policy.

create policy "Clients can view own dog's parents"
  on public.dogs
  for select
  using (id in (select public.my_dog_parent_ids()));

create policy "Clients can view own dog's parent media"
  on public.dog_media
  for select
  using (dog_id in (select public.my_dog_parent_ids()));

alter table public.notifications_log
  add column if not exists is_read boolean not null default false;

create policy "Users can mark own notifications read"
  on public.notifications_log
  for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());
