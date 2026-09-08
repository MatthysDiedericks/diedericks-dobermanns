-- 0154 — Claim dogs on registration.
--
-- claim_my_records() already attaches applications, contacts, quotes,
-- invoices, documents, waitlist and contracts. It never set dogs.owner_id,
-- so a buyer who registers sees every record except the dog they own.
--
-- Link only when owner_id is unset, the owner contact is now this user
-- (and not a merged-away alias), and there is no owner/buyer conflict.
-- Do not link on buyer_contact_id — payer and keeper are often different.
--
-- RETURNS TABLE gains a dogs column, so the previous signature must be
-- dropped first. CREATE OR REPLACE cannot change the return type.

drop function if exists public.claim_my_records();

create or replace function public.claim_my_records()
 returns table(applications integer, quotes integer, waitlist integer, contracts integer, dogs integer)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_confirmed timestamptz;
  a integer := 0; q integer := 0; w integer := 0; c integer := 0; d integer := 0;
begin
  if v_uid is null then
    return query select 0, 0, 0, 0, 0;
    return;
  end if;

  select lower(u.email), u.email_confirmed_at
    into v_email, v_confirmed
    from auth.users u
   where u.id = v_uid;

  if v_email is null or v_confirmed is null then
    return query select 0, 0, 0, 0, 0;
    return;
  end if;

  update public.applications
     set user_id = v_uid
   where user_id is null and lower(email) = v_email;
  get diagnostics a = row_count;

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

  update public.dogs dg
     set owner_id = v_uid
   where dg.owner_id is null
     and dg.owner_contact_id in (
       select ct.id from public.contacts ct
        where ct.user_id = v_uid
          and ct.merged_into_contact_id is null
     )
     and not (
       dg.buyer_contact_id is not null
       and dg.buyer_contact_id is distinct from dg.owner_contact_id
     );
  get diagnostics d = row_count;

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

  update public.invoices i
     set client_id = v_uid
   where i.client_id is null
     and i.quote_id in (
       select qt.id from public.quotes qt where qt.client_id = v_uid
     );

  -- Alias is `doc`, not `d`: the dogs counter is `d integer`, and a
  -- PL/pgSQL variable shadows a SQL alias of the same name.
  update public.documents doc
     set entity_type = 'client',
         entity_id = v_uid
   where doc.entity_type in ('invoice', 'payment')
     and (
       doc.related_invoice_id in (
         select i.id from public.invoices i where i.client_id = v_uid
       )
       or doc.related_quote_id in (
         select qt.id from public.quotes qt where qt.client_id = v_uid
       )
     );

  update public.waiting_list
     set client_id = v_uid
   where client_id is null and lower(enquirer_email) = v_email;
  get diagnostics w = row_count;

  update public.contracts ct
     set client_id = v_uid
   where ct.client_id is null
     and (
       ct.contact_id in (select c.id from public.contacts c where c.user_id = v_uid)
       or ct.reservation_id in (
         select r.id from public.reservations r where r.client_id = v_uid
       )
     );
  get diagnostics c = row_count;

  return query select a, q, w, c, d;
end;
$function$;

grant execute on function public.claim_my_records() to public;
grant execute on function public.claim_my_records() to anon;
grant execute on function public.claim_my_records() to authenticated;
grant execute on function public.claim_my_records() to postgres;
grant execute on function public.claim_my_records() to service_role;
