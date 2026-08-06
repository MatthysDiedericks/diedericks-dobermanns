-- ============================================================================
-- Website client portal + automated application alerts.
--
-- 1. B3 — reminder tracking columns on `applications` so the daily digest
--    (notify-pending-applications Edge Function) is idempotent.
-- 2. notifications_log — two new `type` values for the immediate admin alert
--    and the daily reminder digest (mirrors the 'document_expiry' addition
--    in 0036_document_expiry_reminders.sql).
-- 3. A3.2 — `training_booking_messages`: clients had no way to reply on a
--    training booking. Minimal thread table, RLS scoped to the booking's
--    own client plus trainer/admin.
-- 4. RLS audit for the new website client portal (diedericksdobermann-web).
--    These are ADDITIVE ONLY — no existing policy is narrowed or dropped.
--    Gaps found (confirmed live via pg_policies before writing this):
--      - `dogs`: only `owner_id` and `is_public` grant client SELECT. A
--        client with an approved/completed reservation on a not-yet-public,
--        not-yet-owner-transferred dog could not see it at all.
--      - `dog_media`: only visible when the parent dog `is_public = true`.
--        An owning/reserving client could not see their own dog's photos
--        if the dog record itself is not public.
--      - `health_tests`: had ZERO client-facing SELECT policy (admin +
--        trainer only) — a genuine gap for the portal's dog health summary.
--      - `puppy_health_records` / `training_logs`: client SELECT existed
--        but only via a `reservations` join, not `dogs.owner_id` — added a
--        second, additive policy so an owning client (post-transfer, no
--        active reservation row) still sees their own dog's records.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Applications — reminder bookkeeping
-- ---------------------------------------------------------------------------
alter table public.applications
  add column if not exists last_reminder_sent_at timestamptz;
alter table public.applications
  add column if not exists reminder_count int not null default 0;

create index if not exists idx_applications_status_created
  on public.applications (status, created_at);

-- ---------------------------------------------------------------------------
-- 2. notifications_log — new alert types
-- ---------------------------------------------------------------------------
alter table public.notifications_log drop constraint if exists notifications_log_type_check;
alter table public.notifications_log add constraint notifications_log_type_check
  check (type in (
    'push', 'email', 'whatsapp', 'application_confirmation', 'document_expiry',
    'application_received', 'application_reminder'
  ));

-- ---------------------------------------------------------------------------
-- 3. Training booking messages (client reply thread)
-- ---------------------------------------------------------------------------
create table if not exists public.training_booking_messages (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.training_bookings(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_training_booking_messages_booking
  on public.training_booking_messages (booking_id, created_at);

alter table public.training_booking_messages enable row level security;

create policy "Client can view own booking messages" on public.training_booking_messages
  for select using (
    exists (
      select 1 from public.training_bookings b
      where b.id = training_booking_messages.booking_id and b.client_id = auth.uid()
    )
  );

create policy "Client can send own booking messages" on public.training_booking_messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.training_bookings b
      where b.id = training_booking_messages.booking_id and b.client_id = auth.uid()
    )
  );

create policy "Trainer/admin can view all booking messages" on public.training_booking_messages
  for select using (public.is_trainer_or_above());

create policy "Trainer/admin can send booking messages" on public.training_booking_messages
  for insert with check (sender_id = auth.uid() and public.is_trainer_or_above());

-- ---------------------------------------------------------------------------
-- 4. RLS audit — additive policies for the client portal
-- ---------------------------------------------------------------------------

-- dogs: an approved/completed reservation should grant SELECT even before
-- `owner_id` is set or the dog is made public.
create policy "Clients can view reserved dogs" on public.dogs
  for select using (
    exists (
      select 1 from public.reservations r
      where r.dog_id = dogs.id
        and r.client_id = auth.uid()
        and r.status in ('confirmed', 'completed')
    )
  );

-- dog_media: owner or approved/completed reservation, mirroring the `dogs`
-- access above (existing "Public dog media viewable by all" is untouched).
create policy "Owners/reservers can view dog media" on public.dog_media
  for select using (
    exists (
      select 1 from public.dogs d
      where d.id = dog_media.dog_id
        and (
          d.owner_id = auth.uid()
          or exists (
            select 1 from public.reservations r
            where r.dog_id = d.id
              and r.client_id = auth.uid()
              and r.status in ('confirmed', 'completed')
          )
        )
    )
  );

-- health_tests: previously admin/trainer only — no client path existed.
create policy "Clients can view own dog health tests" on public.health_tests
  for select using (
    exists (
      select 1 from public.dogs d
      where d.id = health_tests.dog_id and d.owner_id = auth.uid()
    )
    or exists (
      select 1 from public.reservations r
      where r.dog_id = health_tests.dog_id
        and r.client_id = auth.uid()
        and r.status in ('confirmed', 'completed')
    )
  );

-- puppy_health_records: additive owner_id path (existing reservation-based
-- "client_view_own_health" policy is untouched).
create policy "Owners can view own dog health records" on public.puppy_health_records
  for select using (
    exists (
      select 1 from public.dogs d
      where d.id = puppy_health_records.dog_id and d.owner_id = auth.uid()
    )
  );

-- training_logs: additive owner_id path (existing reservation-based
-- "Clients can view own dog training logs" policy is untouched).
create policy "Owners can view own dog training logs" on public.training_logs
  for select using (
    exists (
      select 1 from public.dogs d
      where d.id = training_logs.dog_id and d.owner_id = auth.uid()
    )
  );
