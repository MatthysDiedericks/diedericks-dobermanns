-- 0155 — Revoke anon SELECT on dogs.price.
--
-- Apply ONLY after the code that stopped selecting dogs.price on public
-- pages has been deployed. Selecting a revoked column makes PostgREST
-- return 403 for the whole request and takes the public dog pages down.
--
-- Revoke from anon only. authenticated (portal, admin, quotes, contracts)
-- must keep SELECT on price.
--
-- Rollback:
--   grant select (price) on public.dogs to anon;

revoke select (price) on public.dogs from anon;
