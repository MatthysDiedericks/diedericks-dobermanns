-- Two new gallery categories so litter marketing lives where Matt already works.
--
-- WHY: `litters.announcement_image_url` existed and was rendered by the public
-- litter page, the litter cards and the portal, but nothing in admin could set
-- it — the poster had to be written straight into the database. Rather than
-- build a second uploader, announcements ride the gallery that already has
-- upload, compression, ordering and a featured flag.
--
--   planned_litters       photos of a pairing that has not whelped yet
--   litter_announcements  the designed poster for a litter
--
-- Additive only: every existing category is preserved, so no row can be
-- invalidated by this change.
--
-- Applied to the live database on 26 Aug 2026. This file exists so a migration
-- replay does not silently revert it.

alter table public.gallery_items
  drop constraint if exists gallery_items_category_check;

alter table public.gallery_items
  add constraint gallery_items_category_check
  check (category = any (array[
    'puppies',
    'elite_pups',
    'protection_dogs',
    'competition',
    'kennel',
    'family',
    'training',
    'planned_litters',
    'litter_announcements'
  ]));
