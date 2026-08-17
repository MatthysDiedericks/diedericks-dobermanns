-- 0074 — Litter default programme tier, and a real buyer link on quotes.
--
-- Puppies inherit pricing from the litter when they have no own tier/price.
-- Live applicants must not land in historical_client_name; store a contact
-- until they confirm a portal account, then claim_my_records attaches it.

alter table public.litters
  add column if not exists default_programme_tier text;

alter table public.litters
  drop constraint if exists litters_default_programme_tier_check;

alter table public.litters
  add constraint litters_default_programme_tier_check
  check (
    default_programme_tier is null
    or default_programme_tier in ('puppy', 'elite_developed', 'protection_dog')
  );

alter table public.quotes
  add column if not exists contact_id uuid references public.contacts(id) on delete set null;

create index if not exists quotes_contact_id_idx
  on public.quotes (contact_id)
  where contact_id is not null;

comment on column public.quotes.contact_id is
  'CRM contact for a live buyer who does not yet have a confirmed portal account.';

comment on column public.quotes.historical_client_name is
  'Pre-system / not-in-list buyers only. Never used for a live applicant.';

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

  update public.contacts
     set user_id = v_uid
   where user_id is null
     and merged_into_contact_id is null
     and email is not null
     and lower(trim(email)) = v_email;

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
