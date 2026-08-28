-- 0111 — Capture live documents_entity_type_check (widened 20 Aug 2026).
--
-- payment-actions.ts (insertStaffProof) falls back to entity_type 'invoice'
-- when the invoice has no client_id — the normal case for buyers loaded
-- before they register a portal account. The live check was widened that
-- day to allow 'invoice' and 'payment'. Drop + recreate so re-applying is
-- a no-op (the definition already matches production).
--
-- Source: select pg_get_constraintdef(oid) from pg_constraint
-- where conname = 'documents_entity_type_check'
-- on nlmwxodvquwbjinhhbmr, 20 Aug 2026.
--
-- claim_my_records() then re-points those parked rows onto the client once
-- the buyer confirms a portal account. Staff proofs keep provided_by and
-- client_visible so a WhatsApp screenshot never reads as a buyer upload.

alter table public.documents
  drop constraint if exists documents_entity_type_check;

alter table public.documents
  add constraint documents_entity_type_check
  check (entity_type = any (array[
    'dog'::text,
    'litter'::text,
    'puppy'::text,
    'client'::text,
    'application'::text,
    'training'::text,
    'contract'::text,
    'kennel'::text,
    'health'::text,
    'show'::text,
    'invoice'::text,
    'payment'::text
  ]));

-- Quote already claimed, invoice still null (convert copies quote.client_id,
-- which was null at convert time). Idempotent.
update public.invoices i
   set client_id = q.client_id
  from public.quotes q
 where i.quote_id = q.id
   and i.client_id is null
   and q.client_id is not null;

-- Proofs parked on a sale that already has a client. Leave provided_by /
-- client_visible alone.
update public.documents d
   set entity_type = 'client',
       entity_id = i.client_id
  from public.invoices i
 where d.related_invoice_id = i.id
   and d.entity_type in ('invoice', 'payment')
   and i.client_id is not null;

update public.documents d
   set entity_type = 'client',
       entity_id = q.client_id
  from public.quotes q
 where d.related_quote_id = q.id
   and d.entity_type in ('invoice', 'payment')
   and q.client_id is not null;

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

  -- convert_quote_to_invoice copies quotes.client_id, which is null for a
  -- buyer who has not registered yet. Attach the invoice once the quote is.
  update public.invoices i
     set client_id = v_uid
   where i.client_id is null
     and i.quote_id in (
       select qt.id from public.quotes qt where qt.client_id = v_uid
     );

  -- Staff payment proofs were stored as entity_type='invoice' with entity_id
  -- equal to the staff actor (payment-actions.ts line 267). Point them at
  -- the client. Do not flip provided_by or client_visible.
  update public.documents d
     set entity_type = 'client',
         entity_id = v_uid
   where d.entity_type in ('invoice', 'payment')
     and (
       d.related_invoice_id in (
         select i.id from public.invoices i where i.client_id = v_uid
       )
       or d.related_quote_id in (
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
