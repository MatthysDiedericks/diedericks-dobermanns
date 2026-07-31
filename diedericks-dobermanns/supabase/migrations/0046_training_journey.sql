-- Training Journey Timeline: capture media across a training_logs entry's
-- lifetime, publish selectively, and re-tag the public gallery to the tier
-- vocabulary used everywhere else.
--
-- Ground truth verified live before writing this file:
--   - training_logs.progress_level is a TEXT enum
--     ('foundation','intermediate','advanced','proofed'), NOT a 1-10 number.
--     The UI maps these four stages to an ordinal for the timeline spine.
--   - training_logs.training_type check constraint did not include a generic
--     "just captured, not yet categorised" value — 'session' is added below
--     so quick-capture drafts have something valid to write.
--   - gallery_items.category check constraint was exactly
--     ('puppies','training','competition','family','kennel') with 63 live
--     'training' rows and 22 live 'puppies' rows. Both values are KEPT in the
--     widened constraint below — nothing is dropped or reassigned.

-- ---------------------------------------------------------------------------
-- 1. training_logs — journey columns + matching RLS for public/client reads
--    (must run BEFORE training_log_media's policies below, which reference
--    training_logs.is_public)
-- ---------------------------------------------------------------------------

-- Training notes are private by default. Nothing appears publicly unless
-- explicitly published.
alter table public.training_logs add column if not exists is_public boolean not null default false;

-- Chapter grouping for the timeline.
alter table public.training_logs add column if not exists phase text
  check (phase is null or phase in ('foundation', 'development', 'advanced', 'competition'));

-- Entries created by quick-capture that still need their story filled in.
alter table public.training_logs add column if not exists is_draft boolean not null default false;

create index if not exists idx_training_logs_dog_date on public.training_logs (dog_id, session_date);

-- Quick-capture needs a valid training_type before the trainer categorises
-- the entry. 'session' is a generic placeholder alongside the existing
-- discipline-specific values (verified via pg_constraint before adding).
alter table public.training_logs drop constraint if exists training_logs_training_type_check;
alter table public.training_logs add constraint training_logs_training_type_check
  check (training_type in ('obedience', 'protection', 'psa', 'socialization', 'foundation', 'scenario', 'session'));

-- No anonymous/public read path existed on training_logs at all before this
-- feature — every existing policy required an authenticated trainer/owner.
create policy "Public can view published training logs" on public.training_logs
  for select using (
    is_public = true
    and exists (
      select 1 from public.dogs d
      where d.id = training_logs.dog_id and d.is_public = true
    )
  );

-- ---------------------------------------------------------------------------
-- 2. training_log_media — many photos/videos per entry
-- ---------------------------------------------------------------------------
create table if not exists public.training_log_media (
  id uuid primary key default gen_random_uuid(),
  training_log_id uuid not null references public.training_logs(id) on delete cascade,
  media_type text not null check (media_type in ('photo', 'video')),
  storage_path text,
  public_url text not null,
  caption text,
  sort_order int not null default 0,
  uploaded_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_training_log_media_log
  on public.training_log_media (training_log_id, sort_order);

alter table public.training_log_media enable row level security;

create policy "Admins can manage training log media" on public.training_log_media
  for all using (public.is_admin());

create policy "Trainers can view training log media" on public.training_log_media
  for select using (public.is_trainer_or_above());

create policy "Trainers can insert training log media" on public.training_log_media
  for insert with check (public.is_trainer_or_above());

-- Clients see their own dog's FULL record — is_public is irrelevant here.
create policy "Clients can view own dog training log media" on public.training_log_media
  for select using (
    exists (
      select 1 from public.training_logs tl
      join public.dogs d on d.id = tl.dog_id
      where tl.id = training_log_media.training_log_id
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

-- Anonymous/public: only published entries on public dogs.
create policy "Public can view published training log media" on public.training_log_media
  for select using (
    exists (
      select 1 from public.training_logs tl
      join public.dogs d on d.id = tl.dog_id
      where tl.id = training_log_media.training_log_id
        and tl.is_public = true
        and d.is_public = true
    )
  );

-- ---------------------------------------------------------------------------
-- 3. gallery_items — tier-aligned categories + video discipline
-- ---------------------------------------------------------------------------

-- Videos additionally carry a discipline so the public gallery can split them.
alter table public.gallery_items add column if not exists discipline text
  check (discipline is null or discipline in ('protection', 'obedience'));

-- Widen category to the tier vocabulary, keeping the operational ones that
-- are still useful internally. The 63 existing 'training' rows and 22
-- existing 'puppies' rows are untouched — 'training' stays a valid category,
-- it just isn't one of the three public tier filters until re-tagged by hand.
alter table public.gallery_items drop constraint if exists gallery_items_category_check;
alter table public.gallery_items add constraint gallery_items_category_check
  check (category in ('puppies', 'elite_pups', 'protection_dogs', 'competition', 'kennel', 'family', 'training'));
