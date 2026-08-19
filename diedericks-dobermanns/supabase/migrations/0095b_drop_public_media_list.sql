-- Idempotent companion to 0095. Those two public-read policies are already
-- dropped in 0095; this file exists because it was applied by hand the same day.
-- The runner skips `0095b*` as a version name — ledger row is inserted separately.

drop policy if exists "Public read dog-media" on storage.objects;
drop policy if exists "Public read gallery" on storage.objects;
