-- ============================================================================
-- Diedericks Dobermanns — Training Booking System
-- Mirrors the live Supabase schema (already migrated). Captured here for
-- source-control parity. Safe to re-run (idempotent guards where possible).
-- ============================================================================

create table if not exists public.training_session_types (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  duration_minutes integer not null default 60,
  price numeric,
  currency text not null default 'ZAR',
  session_format text not null default 'in_person'
    check (session_format in ('in_person', 'video_call', 'both')),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.training_availability (
  id uuid primary key default gen_random_uuid(),
  available_date date not null,
  start_time text not null,
  end_time text not null,
  session_type_id uuid references public.training_session_types (id) on delete set null,
  trainer_id uuid references public.users (id) on delete set null,
  max_bookings integer not null default 1,
  is_blocked boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.training_bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.users (id) on delete cascade,
  session_type_id uuid not null references public.training_session_types (id),
  availability_id uuid references public.training_availability (id) on delete set null,
  dog_id uuid references public.dogs (id) on delete set null,
  trainer_id uuid references public.users (id) on delete set null,
  scheduled_at timestamptz not null,
  duration_minutes integer not null default 60,
  session_format text not null default 'in_person'
    check (session_format in ('in_person', 'video_call', 'both')),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'completed', 'cancelled')),
  client_notes text,
  trainer_notes text,
  admin_notes text,
  cancellation_reason text,
  cancelled_by uuid references public.users (id) on delete set null,
  cancelled_at timestamptz,
  confirmed_at timestamptz,
  completed_at timestamptz,
  reminder_sent boolean not null default false,
  video_room_name text,
  video_room_url text,
  video_host_url text,
  video_room_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_bookings_client on public.training_bookings (client_id);
create index if not exists idx_bookings_scheduled on public.training_bookings (scheduled_at);

create table if not exists public.training_booking_media (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.training_bookings (id) on delete cascade,
  media_type text not null check (media_type in ('image', 'video')),
  storage_path text not null,
  public_url text,
  caption text,
  uploaded_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- RLS -----------------------------------------------------------------------
alter table public.training_session_types enable row level security;
alter table public.training_availability enable row level security;
alter table public.training_bookings enable row level security;
alter table public.training_booking_media enable row level security;

-- Session types & availability: public read, admin write.
create policy "session types read" on public.training_session_types for select using (true);
create policy "session types admin" on public.training_session_types
  for all using (public.is_admin()) with check (public.is_admin());

create policy "availability read" on public.training_availability for select using (true);
create policy "availability admin" on public.training_availability
  for all using (public.is_admin()) with check (public.is_admin());

-- Bookings: client manages their own; staff sees all.
create policy "bookings read own" on public.training_bookings
  for select using (client_id = auth.uid() or trainer_id = auth.uid() or public.is_admin());
create policy "bookings insert own" on public.training_bookings
  for insert with check (client_id = auth.uid());
create policy "bookings update own or staff" on public.training_bookings
  for update using (client_id = auth.uid() or public.is_admin())
  with check (client_id = auth.uid() or public.is_admin());

-- Booking media: visible to the booking's client + staff; staff/trainer upload.
create policy "booking media read" on public.training_booking_media
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.training_bookings b
      where b.id = training_booking_media.booking_id
        and (b.client_id = auth.uid() or b.trainer_id = auth.uid())
    )
  );
create policy "booking media write" on public.training_booking_media
  for all using (public.is_admin()) with check (public.is_admin());
