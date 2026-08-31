-- 0143 — Pedigree certificate photos.
-- A dog's pedigree photo is a separate choice from the card photo.
-- Ancestor photos are keyed on the normalised registered name so one upload
-- fills every chart that names that dog. is_public defaults to false: these
-- are other kennels' dogs and must not reach the public site until Matt
-- deliberately flips them.

-- ---------------------------------------------------------------------------
-- dogs.pedigree_photo_media_id
-- ---------------------------------------------------------------------------
alter table public.dogs
  add column pedigree_photo_media_id uuid references public.dog_media(id) on delete set null;

comment on column public.dogs.pedigree_photo_media_id is
  'Photo shown on the pedigree certificate. Separate from the card photo (dog_media.is_primary) on
   purpose: a card wants a head shot, a pedigree wants a conformation shot. Null falls back to the
   card photo, then the newest photo.';

create index dogs_pedigree_photo_media_id_idx
  on public.dogs (pedigree_photo_media_id)
  where pedigree_photo_media_id is not null;

-- ---------------------------------------------------------------------------
-- ancestor_photos — one photo per normalised ancestor name
-- ---------------------------------------------------------------------------
create table public.ancestor_photos (
  id uuid primary key default gen_random_uuid(),

  -- lower(btrim(registered_name)). The join key. Unique — one photo per ancestor.
  name_key text not null unique,
  -- As typed, for the admin list. Never used for matching.
  display_name text not null,

  storage_path text not null,
  url text not null,
  thumbnail_url text,

  -- These are other kennels' dogs. Record where the photo came from.
  credit text,
  source_note text,
  -- Off by default: see the warning in the product brief.
  is_public boolean not null default false,

  uploaded_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.ancestor_photos is
  'Conformation photos of ancestors who are not our dogs. Keyed on lower(btrim(registered_name))
   so one upload appears on every chart that names that dog. is_public defaults to false —
   other breeders own these photographs.';

comment on column public.ancestor_photos.name_key is
  'lower(btrim(registered_name)). Unique join key. Never match on display_name.';

create trigger ancestor_photos_set_updated_at
  before update on public.ancestor_photos
  for each row execute function public.set_updated_at();

-- The join has to be indexable or every chart does 30 sequential scans.
create index pedigree_ancestors_name_key_idx
  on public.pedigree_ancestors (lower(btrim(registered_name)));

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.ancestor_photos enable row level security;

-- Writes: admin only. Hiding the upload button is not access control.
create policy "ancestor_photos admin insert" on public.ancestor_photos
  for insert with check (public.is_admin());

create policy "ancestor_photos admin update" on public.ancestor_photos
  for update using (public.is_admin()) with check (public.is_admin());

create policy "ancestor_photos admin delete" on public.ancestor_photos
  for delete using (public.is_admin());

-- Portal clients need to see them on their dog's certificate.
create policy "ancestor_photos authenticated read" on public.ancestor_photos
  for select to authenticated using (true);

-- Anonymous read only where Matt has marked the photo public.
create policy "ancestor_photos anon public read" on public.ancestor_photos
  for select to anon using (is_public = true);

grant select on public.ancestor_photos to anon, authenticated;
grant insert, update, delete on public.ancestor_photos to authenticated;
