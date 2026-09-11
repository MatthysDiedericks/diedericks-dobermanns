-- 0161 — Equipment shop catalogue, enquiry → quote, and marketing consent.
--
-- Equipment never touches the dog pipeline. The only shared surface is quotes:
-- an equipment enquiry converts into quotes + quote_items.
-- Campaign sending is out of scope — this migration only captures consent.

-- ---------------------------------------------------------------------------
-- 1a. Extend the catalogue for the public shop
-- ---------------------------------------------------------------------------
alter table public.catalogue_items
  add column if not exists image_path        text,
  add column if not exists short_description text,
  add column if not exists is_client_visible boolean not null default false,
  add column if not exists stock_status      text not null default 'in_stock';

alter table public.catalogue_items
  drop constraint if exists catalogue_items_stock_status_check;
alter table public.catalogue_items
  add constraint catalogue_items_stock_status_check
  check (stock_status in ('in_stock','made_to_order','sold_out'));

create index if not exists catalogue_items_shop_idx
  on public.catalogue_items (is_active, is_client_visible, sort_order)
  where is_active and is_client_visible;

-- 'enquiry' is used by submit_equipment_enquiry when creating a contact.
do $$
declare
  r record;
begin
  for r in
    select con.conname
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace nsp on nsp.oid = rel.relnamespace
     where nsp.nspname = 'public'
       and rel.relname = 'contacts'
       and con.contype = 'c'
       and pg_get_constraintdef(con.oid) like '%contact_type%'
  loop
    execute format('alter table public.contacts drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.contacts
  add constraint contacts_contact_type_check
  check (contact_type in (
    'client', 'prospect', 'breeder', 'supplier', 'judge', 'staff', 'other', 'enquiry'
  ));

-- ---------------------------------------------------------------------------
-- 1b. Public read on shop-visible catalogue items
-- Prices are published on purpose. Do not column-lock this table.
-- Existing admin / signed-in policies stay; policies are OR'd.
-- ---------------------------------------------------------------------------
drop policy if exists "Public can read shop items" on public.catalogue_items;
create policy "Public can read shop items"
on public.catalogue_items for select
using (is_active = true and is_client_visible = true);

grant select on public.catalogue_items to anon;

-- ---------------------------------------------------------------------------
-- 1c. Enquiry tables
-- ---------------------------------------------------------------------------
create table if not exists public.equipment_enquiries (
  id               uuid primary key default gen_random_uuid(),
  contact_id       uuid references public.contacts(id) on delete set null,
  client_id        uuid references auth.users(id) on delete set null,
  full_name        text not null,
  email            text not null,
  phone            text not null,
  fulfilment       text not null default 'collection',
  delivery_address text,
  message          text,
  status           text not null default 'new',
  quote_id         uuid references public.quotes(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint equipment_enquiries_fulfilment_check
    check (fulfilment in ('delivery','collection')),
  constraint equipment_enquiries_status_check
    check (status in ('new','quoted','closed')),
  constraint equipment_enquiries_address_required_for_delivery
    check (fulfilment = 'collection'
           or (delivery_address is not null and length(trim(delivery_address)) > 0))
);

create table if not exists public.equipment_enquiry_items (
  id                uuid primary key default gen_random_uuid(),
  enquiry_id        uuid not null references public.equipment_enquiries(id) on delete cascade,
  catalogue_item_id uuid not null references public.catalogue_items(id),
  quantity          integer not null default 1 check (quantity > 0 and quantity <= 99),
  note              text
);

create index if not exists equipment_enquiries_status_idx
  on public.equipment_enquiries (status, created_at desc);
create index if not exists equipment_enquiries_contact_idx
  on public.equipment_enquiries (contact_id);
create index if not exists equipment_enquiries_client_idx
  on public.equipment_enquiries (client_id);
create index if not exists equipment_enquiry_items_enquiry_idx
  on public.equipment_enquiry_items (enquiry_id);

create or replace function public.touch_equipment_enquiries()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_equipment_enquiries on public.equipment_enquiries;
create trigger trg_touch_equipment_enquiries
  before update on public.equipment_enquiries
  for each row execute function public.touch_equipment_enquiries();

alter table public.equipment_enquiries      enable row level security;
alter table public.equipment_enquiry_items  enable row level security;

drop policy if exists "Admins manage equipment enquiries" on public.equipment_enquiries;
create policy "Admins manage equipment enquiries"
on public.equipment_enquiries for all
using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Client reads own equipment enquiries" on public.equipment_enquiries;
create policy "Client reads own equipment enquiries"
on public.equipment_enquiries for select
using (client_id = auth.uid());

drop policy if exists "Admins manage equipment enquiry items" on public.equipment_enquiry_items;
create policy "Admins manage equipment enquiry items"
on public.equipment_enquiry_items for all
using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Client reads own equipment enquiry items" on public.equipment_enquiry_items;
create policy "Client reads own equipment enquiry items"
on public.equipment_enquiry_items for select
using (exists (select 1 from public.equipment_enquiries e
               where e.id = equipment_enquiry_items.enquiry_id
                 and e.client_id = auth.uid()));

select public.enable_audit('equipment_enquiries');
select public.enable_audit('equipment_enquiry_items');

-- Table-level grants: authenticated may read/write (RLS still applies).
-- anon must not INSERT — the only write path is submit_equipment_enquiry().
revoke all on table public.equipment_enquiries from anon, public;
revoke all on table public.equipment_enquiry_items from anon, public;
grant select, insert, update, delete on table public.equipment_enquiries to authenticated;
grant select, insert, update, delete on table public.equipment_enquiry_items to authenticated;
grant all on table public.equipment_enquiries to service_role;
grant all on table public.equipment_enquiry_items to service_role;

-- ---------------------------------------------------------------------------
-- 1d. Submission function — the only write path for the public form
-- ---------------------------------------------------------------------------
create or replace function public.submit_equipment_enquiry(
  p_full_name    text,
  p_email        text,
  p_phone        text,
  p_fulfilment   text,
  p_address      text,
  p_message      text,
  p_marketing    boolean,
  p_items        jsonb
) returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_email   text := lower(trim(p_email));
  v_contact uuid;
  v_enquiry uuid;
  v_item    jsonb;
begin
  if v_email is null or position('@' in v_email) = 0 then
    raise exception 'A valid email is required';
  end if;
  if coalesce(trim(p_full_name),'') = '' or coalesce(trim(p_phone),'') = '' then
    raise exception 'Name and phone are required';
  end if;
  if jsonb_array_length(coalesce(p_items,'[]'::jsonb)) = 0 then
    raise exception 'Add at least one item';
  end if;

  -- Public form: throttle before touching contacts. Same helpers the
  -- applications insert trigger uses (50/hour there). service_role exempt.
  if auth.role() is distinct from 'service_role' then
    if not public.check_rate_limit(
         'equipment_enquiry',
         public.rate_limit_request_key('equipment_enquiry'),
         10, 3600) then
      raise exception '%', public.rate_limit_blocked_message() using errcode = 'P0001';
    end if;
    if not public.check_rate_limit(
         'equipment_enquiry_day',
         public.rate_limit_request_key('equipment_enquiry_day'),
         30, 86400) then
      raise exception '%', public.rate_limit_blocked_message() using errcode = 'P0001';
    end if;
  end if;

  -- Match an existing contact before creating another one.
  select c.id into v_contact
    from public.contacts c
   where c.merged_into_contact_id is null
     and lower(trim(c.email)) = v_email
   order by c.created_at
   limit 1;

  if v_contact is null then
    insert into public.contacts (full_name, email, phone, address, contact_type, source)
    values (trim(p_full_name), v_email, trim(p_phone), p_address, 'enquiry', 'equipment_shop')
    returning id into v_contact;
  else
    update public.contacts
       set phone   = coalesce(nullif(trim(phone),''), trim(p_phone)),
           address = coalesce(nullif(trim(address),''), p_address),
           updated_at = now()
     where id = v_contact;
  end if;

  if p_marketing is true then
    update public.contacts
       set marketing_opt_in   = true,
           popia_consent      = true,
           popia_consent_date = now()
     where id = v_contact;
  end if;

  insert into public.equipment_enquiries
    (contact_id, client_id, full_name, email, phone, fulfilment, delivery_address, message)
  values
    (v_contact, auth.uid(), trim(p_full_name), v_email, trim(p_phone),
     p_fulfilment, p_address, p_message)
  returning id into v_enquiry;

  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into public.equipment_enquiry_items (enquiry_id, catalogue_item_id, quantity)
    select v_enquiry,
           (v_item->>'catalogue_item_id')::uuid,
           greatest(1, least(99, coalesce((v_item->>'quantity')::int, 1)))
     where exists (select 1 from public.catalogue_items ci
                    where ci.id = (v_item->>'catalogue_item_id')::uuid
                      and ci.is_active and ci.is_client_visible);
  end loop;

  return v_enquiry;
end;
$function$;

grant execute on function public.submit_equipment_enquiry(
  text, text, text, text, text, text, boolean, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1e. Consent on the dog application
-- Only ever propagate true onto contacts — never revoke an earlier consent.
-- ---------------------------------------------------------------------------
alter table public.applications
  add column if not exists marketing_opt_in boolean not null default false;

-- The live function returns 4 columns (applications, quotes, waitlist, contracts).
-- This version adds a 5th, `dogs`. PostgreSQL refuses to change a function's return
-- type via CREATE OR REPLACE ("cannot change return type of existing function"), which
-- aborted this whole migration on 8 Sep 2026. It must be dropped first.
--
-- Verified safe on that date: zero RLS policies and zero other functions reference
-- claim_my_records, so dropping it cannot break a policy. Grants are re-issued at the
-- end of this block because DROP discards them.
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

  -- True-only: a later application must never silently revoke an earlier consent.
  update public.contacts ct
     set marketing_opt_in   = true,
         popia_consent      = true,
         popia_consent_date = coalesce(ct.popia_consent_date, now())
   where ct.merged_into_contact_id is null
     and (
       ct.user_id = v_uid
       or (ct.email is not null and lower(trim(ct.email)) = v_email)
     )
     and exists (
       select 1
         from public.applications ap
        where ap.marketing_opt_in is true
          and lower(trim(ap.email)) = v_email
     );

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

-- ---------------------------------------------------------------------------
-- 1f. Public equipment image bucket — size and type limited at the bucket
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('equipment','equipment', true, 5242880,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists "equipment bucket public read" on storage.objects;
create policy "equipment bucket public read"
on storage.objects for select
using (bucket_id = 'equipment');

drop policy if exists "equipment bucket admin insert" on storage.objects;
create policy "equipment bucket admin insert"
on storage.objects for insert
with check (bucket_id = 'equipment' and (select public.is_admin()));

drop policy if exists "equipment bucket admin update" on storage.objects;
create policy "equipment bucket admin update"
on storage.objects for update
using (bucket_id = 'equipment' and (select public.is_admin()))
with check (bucket_id = 'equipment' and (select public.is_admin()));

drop policy if exists "equipment bucket admin delete" on storage.objects;
create policy "equipment bucket admin delete"
on storage.objects for delete
using (bucket_id = 'equipment' and (select public.is_admin()));
