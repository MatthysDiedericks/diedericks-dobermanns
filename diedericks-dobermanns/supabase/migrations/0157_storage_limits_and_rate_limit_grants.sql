-- 0157 — Cap uploads; drop misleading grants on rate-limit tables.
--
-- Independent of 0154–0156. Apply after those if they are pending, or on
-- its own — it does not touch dogs.price or claim_my_records.
--
-- storage.buckets: six of seven buckets had file_size_limit and
-- allowed_mime_types null. training-videos is already capped (leave it).
-- App code still validates; this is the storage-side backstop.
--
-- rate_limit_buckets / rate_limit_secrets: RLS on, zero policies, so
-- PostgREST already fails closed. The app hits them only via
-- SECURITY DEFINER check_rate_limit(). Table grants to anon and
-- authenticated are therefore misleading — revoke them.
--
-- Rollback:
--   update storage.buckets
--      set file_size_limit = null, allowed_mime_types = null
--    where id in ('documents','dog-media','gallery','litter-media',
--                 'contract-signatures','broadcasts','avatars','testimonials');
--   grant all on table public.rate_limit_buckets to anon, authenticated;
--   grant all on table public.rate_limit_secrets to anon, authenticated;

update storage.buckets
   set file_size_limit = 15728640,
       allowed_mime_types = array[
         'application/pdf',
         'image/jpeg',
         'image/png',
         'image/webp',
         'image/heic',
         'image/heif'
       ]
 where id = 'documents';

update storage.buckets
   set file_size_limit = 20971520,
       allowed_mime_types = array[
         'image/jpeg',
         'image/png',
         'image/webp',
         'image/heic',
         'image/heif',
         'video/mp4'
       ]
 where id in ('dog-media', 'gallery', 'litter-media');

update storage.buckets
   set file_size_limit = 5242880,
       allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp']
 where id in ('contract-signatures', 'avatars');

update storage.buckets
   set file_size_limit = 15728640,
       allowed_mime_types = array[
         'application/pdf',
         'image/jpeg',
         'image/png',
         'image/webp'
       ]
 where id = 'broadcasts';

update storage.buckets
   set file_size_limit = 10485760,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'testimonials';

revoke all on table public.rate_limit_buckets from anon, authenticated;
revoke all on table public.rate_limit_secrets from anon, authenticated;
