-- claim_my_records() already rejects a missing session as the first statement
-- (if v_uid is null then return 0,0,0,0). Confirmed live via pg_get_functiondef
-- on 18 Aug 2026. Do not raise — this runs on every sign-in.
--
-- Re-assert EXECUTE so CREATE OR REPLACE elsewhere never drops callers.

grant execute on function public.claim_my_records() to public;
grant execute on function public.claim_my_records() to anon;
grant execute on function public.claim_my_records() to authenticated;
grant execute on function public.claim_my_records() to postgres;
grant execute on function public.claim_my_records() to service_role;
grant execute on function public.is_admin() to public, anon, authenticated, service_role;
grant execute on function public.is_trainer_or_above() to public, anon, authenticated, service_role;
