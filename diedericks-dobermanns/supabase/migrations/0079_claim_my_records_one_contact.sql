-- 0079 - Capture live claim_my_records() (fixed 17 Aug 2026 on production).
--
-- Previously the contacts update attached user_id to EVERY matching email.
-- A buyer who applies and then registers ends up with two contact rows, so
-- the update hit idx_contacts_user_id (23505) and aborted the whole function.
-- Live DB now claims exactly one contact - richest, then oldest - and skips
-- if the user already has a contact.
--
-- Source of truth: select pg_get_functiondef(oid) from pg_proc
-- where proname = 'claim_my_records' on nlmwxodvquwbjinhhbmr, 17 Aug 2026.
-- EXECUTE grants re-asserted so CREATE OR REPLACE never drops callers
-- (current: PUBLIC, anon, authenticated, postgres, service_role).

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

  if v_email is null or v_confirmed is null then
    return query select 0, 0, 0, 0;
    return;
  end if;

  update public.applications
     set user_id = v_uid
   where user_id is null and lower(email) = v_email;
  get diagnostics a = row_count;

  -- FIXED 17 Aug 2026: this previously updated EVERY contact matching the email.
  -- A buyer who applies and then registers ends up with two contact rows, so the
  -- update tried to give one user_id to both and hit idx_contacts_user_id (23505),
  -- aborting the whole function. Claim exactly one - the richest, then the oldest.
  update public.contacts
     set user_id = v_uid
   where id = (
     select ct.id from public.contacts ct
      where ct.user_id is null
        and ct.merged_into_contact_id is null
        and ct.email is not null
        and lower(trim(ct.email)) = v_email
      order by (ct.phone is not null)::int + (ct.address is not null)::int
             + (ct.city is not null)::int + (length(coalesce(ct.full_name,'')) > 0)::int desc,
               ct.created_at asc
      limit 1
   )
   and not exists (select 1 from public.contacts x where x.user_id = v_uid);

  update public.quotes qt
     set client_id = v_uid
   where qt.client_id is null
     and (
       qt.application_id in (
         select ap.id from public.applications ap where ap.user_id = v_uid
       )
       or qt.contact_id in (
         select ct.id from public.contacts ct
          where ct.email is not null
            and lower(trim(ct.email)) = v_email
       )
     );
  get diagnostics q = row_count;

  update public.waiting_list
     set client_id = v_uid
   where client_id is null and lower(enquirer_email) = v_email;
  get diagnostics w = row_count;

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
