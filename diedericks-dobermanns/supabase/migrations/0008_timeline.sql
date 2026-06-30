-- ============================================================================
-- Diedericks Dobermanns — Dog story / timeline
-- A chronological feed per dog. Kennel staff post training updates (photos +
-- videos + notes); reserving clients can also post photos of their own dog.
-- Photos are stored as an array of public URLs (dog-media bucket). One optional
-- video URL per entry keeps the model simple.
-- ============================================================================

create table if not exists public.dog_timeline (
  id uuid primary key default gen_random_uuid(),
  dog_id uuid not null references public.dogs (id) on delete cascade,
  author_id uuid references public.users (id) on delete set null,
  source text not null default 'kennel' check (source in ('kennel', 'client')),
  category text not null default 'general'
    check (category in ('general', 'training', 'milestone', 'health', 'client_update')),
  entry_date date not null default current_date,
  title text not null,
  notes text,
  photo_urls text[] not null default '{}',
  video_url text,
  created_at timestamptz not null default now()
);

create index if not exists idx_dog_timeline_dog on public.dog_timeline (dog_id, entry_date desc);

alter table public.dog_timeline enable row level security;

-- Staff see everything; a client sees the timeline for any dog they reserve.
create policy "timeline read" on public.dog_timeline
  for select using (
    public.is_trainer_or_above()
    or exists (
      select 1 from public.reservations r
      where r.dog_id = dog_timeline.dog_id and r.client_id = auth.uid()
    )
  );

-- Kennel staff (trainers + admins) manage all entries.
create policy "timeline staff write" on public.dog_timeline
  for all using (public.is_trainer_or_above()) with check (public.is_trainer_or_above());

-- A client may add a client-sourced entry for a dog they reserve.
create policy "timeline client insert" on public.dog_timeline
  for insert with check (
    source = 'client'
    and author_id = auth.uid()
    and exists (
      select 1 from public.reservations r
      where r.dog_id = dog_timeline.dog_id and r.client_id = auth.uid()
    )
  );

-- A client may remove their own contributions.
create policy "timeline client delete own" on public.dog_timeline
  for delete using (author_id = auth.uid());
