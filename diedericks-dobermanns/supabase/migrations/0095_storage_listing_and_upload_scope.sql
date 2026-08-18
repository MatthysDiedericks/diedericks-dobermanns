-- Phase 2: stop anon bucket enumeration; scope media uploads.
-- Public object URLs still work because the buckets are public.
-- SELECT on storage.objects is listing — anon must not have it.
-- Do not revoke EXECUTE on is_admin() or is_trainer_or_above().
--
-- Numbered after Phase 1 (0086–0092) so the two critical live captures
-- apply first. Do not apply this until Phase 1 is verified.

update storage.buckets
   set public = true
 where id in ('dog-media', 'gallery', 'training-videos');

-- 1. Listing: authenticated staff/clients may list; anon may not.
drop policy if exists "public buckets read" on storage.objects;
drop policy if exists "Public read dog-media" on storage.objects;
drop policy if exists "Public read gallery" on storage.objects;
drop policy if exists "training videos authenticated read" on storage.objects;
drop policy if exists "authenticated list public media" on storage.objects;

create policy "authenticated list public media"
on storage.objects
for select
to authenticated
using (
  bucket_id in ('dog-media', 'gallery', 'testimonials', 'training-videos')
);

-- 2. Inserts: gallery + training-videos staff only; dog-media staff anywhere,
--    clients only under {auth.uid()}/…
drop policy if exists "Auth insert dog-media" on storage.objects;
drop policy if exists "Auth insert gallery" on storage.objects;
drop policy if exists "staff insert gallery" on storage.objects;
drop policy if exists "staff insert training-videos" on storage.objects;
drop policy if exists "staff or owner insert dog-media" on storage.objects;

create policy "staff insert gallery"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'gallery'
  and public.is_trainer_or_above()
);

create policy "staff insert training-videos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'training-videos'
  and public.is_trainer_or_above()
);

create policy "staff or owner insert dog-media"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'dog-media'
  and (
    public.is_trainer_or_above()
    or (storage.foldername(name))[1] = auth.uid()::text
  )
);
