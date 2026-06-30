-- ============================================================================
-- Storage buckets and access policies.
--   dog-media     public read,  admin write
--   gallery       public read,  admin write
--   testimonials  public read,  admin write
--   documents     private,      RLS by owning user
--   avatars       private,      RLS by owning user
-- ============================================================================

insert into storage.buckets (id, name, public)
values
  ('dog-media', 'dog-media', true),
  ('gallery', 'gallery', true),
  ('testimonials', 'testimonials', true),
  ('documents', 'documents', false),
  ('avatars', 'avatars', false)
on conflict (id) do nothing;

-- Public-read buckets: anyone can read, only admins can write/update/delete.
create policy "public buckets read" on storage.objects
  for select using (bucket_id in ('dog-media', 'gallery', 'testimonials'));

create policy "public buckets admin write" on storage.objects
  for insert with check (
    bucket_id in ('dog-media', 'gallery', 'testimonials') and public.is_admin()
  );

create policy "public buckets admin modify" on storage.objects
  for update using (
    bucket_id in ('dog-media', 'gallery', 'testimonials') and public.is_admin()
  );

create policy "public buckets admin delete" on storage.objects
  for delete using (
    bucket_id in ('dog-media', 'gallery', 'testimonials') and public.is_admin()
  );

-- Private buckets: object key is prefixed with the owner's user id
-- (e.g. `documents/<uid>/contract.pdf`). Admins retain full access.
create policy "private read own" on storage.objects
  for select using (
    bucket_id in ('documents', 'avatars')
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

create policy "private write own" on storage.objects
  for insert with check (
    bucket_id in ('documents', 'avatars')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "private modify own" on storage.objects
  for update using (
    bucket_id in ('documents', 'avatars')
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

create policy "private delete own" on storage.objects
  for delete using (
    bucket_id in ('documents', 'avatars')
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );
