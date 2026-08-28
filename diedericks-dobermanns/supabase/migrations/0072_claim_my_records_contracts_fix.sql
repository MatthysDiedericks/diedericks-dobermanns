-- 0072 — Capture live claim_my_records() (fixed 13 Aug 2026 on production).
--
-- Previously the contracts block joined quotes on c2.quote_id (column does not
-- exist → 42703), aborting the whole function so applications/quotes/waitlist
-- were never claimed. Live DB now links contracts via reservation_id →
-- reservations.client_id. This migration records that exact definition.
--
-- EXECUTE grants are re-asserted so CREATE OR REPLACE never leaves callers
-- without privilege (current: PUBLIC, anon, authenticated, postgres, service_role).

create or replace function public.claim_my_records()
 returns table(applications integer, quotes integer, waitlist integer, contracts integer)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_confirmed timestamptz;
  a integer := 0; q integer := 0; w integer := 0; c integer := 0;
begin
  if v_uid is null then
    return query select 0, 0, 0, 0;
    return;
  end if;

  select lower(u.email), u.email_confirmed_at
    into v_email, v_confirmed
    from auth.users u
   where u.id = v_uid;

  -- An unconfirmed address proves nothing. Claiming on it would let anyone
  -- take over a stranger's records simply by typing their email at signup.
  if v_email is null or v_confirmed is null then
    return query select 0, 0, 0, 0;
    return;
  end if;

  update public.applications
     set user_id = v_uid
   where user_id is null and lower(email) = v_email;
  get diagnostics a = row_count;

  -- Quotes raised before the account existed carry the buyer's name only. Match
  -- through the application, which does hold the email.
  update public.quotes qt
     set client_id = v_uid
   where qt.client_id is null
     and qt.application_id in (
       select ap.id from public.applications ap where ap.user_id = v_uid
     );
  get diagnostics q = row_count;

  update public.waiting_list
     set client_id = v_uid
   where client_id is null and lower(enquirer_email) = v_email;
  get diagnostics w = row_count;

  -- FIXED 13 Aug 2026: previously joined quotes on c2.quote_id, a column that
  -- does not exist on contracts. That raised 42703 and aborted the WHOLE
  -- function, so applications, quotes and waiting-list entries were never
  -- claimed for anyone. Contracts reach a client through the reservation.
  update public.contracts ct
     set client_id = v_uid
   where ct.client_id is null
     and ct.reservation_id in (
       select r.id from public.reservations r where r.client_id = v_uid
     );
  get diagnostics c = row_count;

  return query select a, q, w, c;
end;
$function$;

grant execute on function public.claim_my_records() to public;
grant execute on function public.claim_my_records() to anon;
grant execute on function public.claim_my_records() to authenticated;
grant execute on function public.claim_my_records() to postgres;
grant execute on function public.claim_my_records() to service_role;
