# Cursor Prompt — Equipment shop, enquiry to quote, and marketing consent

## Do this first

1. Read the whole file before changing anything.
2. Both repos: `diedericks-dobermanns` (app) and `diedericksdobermann-web` (website).
3. Migration is **0161**, byte-identical in both `supabase/migrations/` folders.
4. Do **not** apply anything to the live database. Matt applies it.
5. No test rows in production. No test enquiries, no test catalogue items.
6. Finish with `npx tsc --noEmit` in both repos and paste the real output.

**Campaigns are OUT OF SCOPE.** `campaigns` and `campaign_recipients` already exist and are empty. Do not build a send screen, do not send any email to a list. This prompt only *captures* consent. Sending is a separate prompt.

---

## What already exists — do not rebuild it

- **`catalogue_items`** — 12 rows, 7 active. Columns: `code, label, item_type, category, default_price, price_varies, description_template, notes, is_active, sort_order`. This is the quote catalogue and it becomes the shop catalogue. Do **not** create a new products table.
- **`quotes` + `quote_items`** — the enquiry converts into these. Do not invent a second quoting path.
- **`contacts`** — already has `marketing_opt_in`, `is_do_not_sell`, `popia_consent`, `popia_consent_date`, and `full_name` as a **single column** (not first/last).
- Storage buckets already exist; `dog-media` and `gallery` are public.

---

## The separation rule

Equipment must never touch the dog pipeline. No reads or writes to `applications`, `waiting_list`, `reservations`, `pipeline_stage`, or anything that could alter a queue position or a puppy allocation. The dog side exists for customer service; the shop is retail.

The one place they meet is the **quote** — an equipment enquiry converts into the existing `quotes` + `quote_items` so it lands in the same ledger, letterhead and acceptance flow. One quote system, two front doors.

---

## Task 1 — Schema (migration 0161)

### 1a. Extend the catalogue

```sql
alter table public.catalogue_items
  add column if not exists image_path        text,
  add column if not exists short_description text,
  add column if not exists is_client_visible boolean not null default false,
  add column if not exists stock_status      text not null default 'in_stock';

alter table public.catalogue_items
  add constraint catalogue_items_stock_status_check
  check (stock_status in ('in_stock','made_to_order','sold_out'));
```

`is_active` already controls whether an item can be picked in the quote builder. `is_client_visible` is separate and controls whether it appears in the shop — Matt must be able to keep an internal line item that customers never see. Both must be true to appear publicly.

`short_description` is shop copy. `description_template` is the text that lands on a quote line. Do not conflate them.

### 1b. Public read on the catalogue

Prices here are **published on purpose** — the opposite of `dogs.price`. Do **not** apply the column-lock pattern from migration 0159 to this table.

```sql
create policy "Public can read shop items"
on public.catalogue_items for select
using (is_active = true and is_client_visible = true);

grant select on public.catalogue_items to anon;
```

Leave the existing `Admins manage catalogue` and `Signed-in can read active catalogue` policies exactly as they are. Policies are OR'd, so adding this one widens read for anon without narrowing anything.

### 1c. Enquiry tables

```sql
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

alter table public.equipment_enquiries      enable row level security;
alter table public.equipment_enquiry_items  enable row level security;
```

RLS. **A new table with RLS on and no policy denies everyone** — every table below needs its policies.

```sql
create policy "Admins manage equipment enquiries"
on public.equipment_enquiries for all
using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "Client reads own equipment enquiries"
on public.equipment_enquiries for select
using (client_id = auth.uid());

create policy "Admins manage equipment enquiry items"
on public.equipment_enquiry_items for all
using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "Client reads own equipment enquiry items"
on public.equipment_enquiry_items for select
using (exists (select 1 from public.equipment_enquiries e
               where e.id = equipment_enquiry_items.enquiry_id
                 and e.client_id = auth.uid()));
```

**Do not grant INSERT to `anon` on these tables.** Submission goes through the function below.

### 1d. Submission function — the only way in

A public form that INSERTs directly is a spam vector and will duplicate contacts. Use one `SECURITY DEFINER` function so validation, contact matching and consent all happen server-side.

```sql
create or replace function public.submit_equipment_enquiry(
  p_full_name    text,
  p_email        text,
  p_phone        text,
  p_fulfilment   text,
  p_address      text,
  p_message      text,
  p_marketing    boolean,
  p_items        jsonb   -- [{"catalogue_item_id":"uuid","quantity":1}, ...]
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
```

Note the item insert re-checks `is_active and is_client_visible` — a caller cannot enquire about a hidden internal line by posting its id.

**TRAP:** never `revoke execute` on a function used inside an RLS policy. That is not this function, but it has caused a 6.7 hour outage on this project — do not "harden" `is_admin()` or the `my_*_client_ids()` functions while you are in here.

### 1e. Consent on the dog application

```sql
alter table public.applications
  add column if not exists marketing_opt_in boolean not null default false;
```

When `claim_my_records()` or the approval flow links an application to a contact, propagate a `true` onto `contacts.marketing_opt_in`, `popia_consent` and `popia_consent_date`. **Only ever propagate true — never set it back to false**, or a later application would silently revoke an earlier consent.

### 1f. Storage bucket

```sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('equipment','equipment', true, 5242880,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
```

Public read (product photos are marketing), admin-only write. Add storage policies for insert, update and delete restricted to `is_admin()` — six of seven existing buckets have no size or type limit, so do not repeat that here.

---

## Task 2 — Screens

### Public shop (website, and matching screen in the app)

Grid of cards: image, label, `short_description`, price. When `price_varies` is true show **"Price on request"** instead of a number. Show `stock_status` when it is not `in_stock`.

Basket: multiple items with quantities, held in component state.

Enquiry form, all required except where noted:

- Full name — **one field**, writes to `contacts.full_name`. Do not split into first/surname; the column is single and splitting would need a schema change for no gain.
- Email, mobile
- Delivery or collection toggle
- Delivery address — required **only** when delivery is chosen. Hide it entirely for collection.
- Message — optional
- **Consent checkbox, unticked by default, separate from any terms acceptance.** Wording: *"Send me news about upcoming litters, available dogs and equipment. You can stop this at any time."* Bundling consent with terms invalidates it.

Copy near the button must say this is **not an order**: *"Not an order. We reply with a quote."*

**Signed-in clients:** prefill name, email and phone from their contact and show a compact summary with an Edit control rather than empty boxes. Do not create a second contact for someone who is already signed in.

### Admin

- **Catalogue manager**: create and edit items, upload image to the `equipment` bucket, set price or `price_varies`, `is_client_visible`, `stock_status`, `sort_order`.
- **Enquiries list**: new / quoted / closed, with the items, contact and fulfilment method.
- **Convert to quote**: build a `quotes` row with one `quote_items` line per enquiry item, taking `default_price` and `description_template` from the catalogue, then set `equipment_enquiries.quote_id` and `status = 'quoted'`. Reuse the existing quote builder — do not write a parallel one.

### Dog application form (both repos)

Add the same consent checkbox, unticked, separate from the terms box, writing to `applications.marketing_opt_in`.

### Email Matt when an enquiry arrives

Matt confirmed on 8 Sep 2026 that enquiries must reach his inbox, not just sit in admin.

Send **one plain notification to Matt only** — never to the enquirer, never to a list. Reuse the existing `send-email` edge function and the same Resend setup the application alert uses; do not add a second mail provider.

The mail contains: enquirer name, email, phone, collection or delivery, the delivery address when given, the items and quantities, their message, and a link to the enquiry in admin.

Trigger it **after** the enquiry row is committed, and make a mail failure non-fatal — a bounced notification must never lose the enquiry. Log a failure to `error_events` with code `EQUIPMENT_ENQUIRY_MAIL_FAILED` rather than raising.

This is a transactional message to the business owner about his own data. It is **not** marketing, needs no opt-in, and must not go near `campaigns`.

---

## What NOT to change

- Do not touch `applications`, `waiting_list`, `reservations` or `pipeline_stage` beyond the single `marketing_opt_in` column.
- Do not apply the 0159 column-lock to `catalogue_items` — equipment prices are public by design.
- Do not touch `my_client_ids()` or `my_financial_client_ids()`.
- Do not build, wire, or trigger anything in `campaigns` / `campaign_recipients`. No email is sent by this work.
- Do not pre-tick the consent box anywhere.

---

## Acceptance checks — report the real number for each

1. `npx tsc --noEmit` clean in both repos. Paste the output.
2. Migration `0161` present in both folders, byte-identical. Show the diff.
3. `equipment_enquiries` and `equipment_enquiry_items` each have RLS enabled **and** at least 2 policies.
4. Grep both repos: zero reads or writes to `waiting_list`, `applications` (other than `marketing_opt_in`), `reservations` or `pipeline_stage` from any equipment file. List what you searched.
5. Confirm `anon` has **no** INSERT grant on either enquiry table, and that `submit_equipment_enquiry` is the only write path.
6. Confirm the consent checkbox defaults to unticked in both the shop form and the application form, and is a separate control from terms acceptance.
7. Confirm no email-sending code was added.
8. Confirm you did not run anything against the live database.

**After Matt applies 0161**, the close-out is a rendered check, not SQL: open the shop **signed out** and confirm items and prices appear; submit an enquiry with a brand-new email and confirm exactly **one** new contact is created; submit a second enquiry with the **same** email and confirm **no** second contact appears; then open the shop signed in as a client and confirm the form is prefilled and still creates no duplicate.
