-- Quote catalogue: what Matt sells (names), not what he charges (prices).
-- Delivery is one catalogue item among many — no delivery_rates table.
-- Number is 0071 (next free). 0067 remains an intentional gap; do not renumber.

-- ---------------------------------------------------------------------------
-- catalogue_items
-- ---------------------------------------------------------------------------
create table if not exists public.catalogue_items (
  id              uuid primary key default gen_random_uuid(),
  code            text not null unique,
  label           text not null,
  item_type       text not null
    check (item_type in (
      'dog', 'delivery', 'board_train', 'training', 'transport', 'accessory', 'other'
    )),
  category        text not null
    check (category in (
      'dog', 'logistics', 'export', 'health', 'training', 'accessory', 'other'
    )),
  default_price   numeric(10,2),
  price_varies    boolean not null default true,
  description_template text,
  notes           text,
  is_active       boolean not null default true,
  sort_order      integer not null default 0,
  updated_by      uuid references auth.users(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint catalogue_price_consistent
    check (price_varies or default_price is not null)
);

create index if not exists catalogue_items_active_idx
  on public.catalogue_items(is_active, category, sort_order);

alter table public.catalogue_items enable row level security;

-- Quote builder needs active items; settings needs inactive too (admins).
drop policy if exists "Signed-in can read active catalogue" on public.catalogue_items;
create policy "Signed-in can read active catalogue" on public.catalogue_items
  for select to authenticated
  using (is_active = true or public.is_admin());

drop policy if exists "Admins manage catalogue" on public.catalogue_items;
create policy "Admins manage catalogue" on public.catalogue_items
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.touch_catalogue_items()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_catalogue_items on public.catalogue_items;
create trigger trg_touch_catalogue_items
  before update on public.catalogue_items
  for each row execute function public.touch_catalogue_items();

select public.enable_audit('catalogue_items');

-- Seed names only — every row price_varies, default_price null. Not a price list.
insert into public.catalogue_items
  (code, label, item_type, category, default_price, price_varies, description_template, notes, sort_order)
values
  ('export_crate', 'Export crate', 'transport', 'export', null, true, 'Export crate',
   '[starter] Starting suggestion — edit, price or deactivate.', 10),
  ('airline_freight', 'Airline freight', 'transport', 'export', null, true, 'Airline freight',
   '[starter] Starting suggestion — edit, price or deactivate.', 20),
  ('export_permit', 'Export permit / documentation', 'other', 'export', null, true,
   'Export permit / documentation',
   '[starter] Starting suggestion — edit, price or deactivate.', 30),
  ('health_certificate', 'Health certificate (state vet)', 'other', 'health', null, true,
   'Health certificate (state vet)',
   '[starter] Starting suggestion — edit, price or deactivate.', 40),
  ('rabies_titre', 'Rabies titre test', 'other', 'health', null, true, 'Rabies titre test',
   '[starter] Starting suggestion — edit, price or deactivate.', 50),
  ('vaccination_course', 'Vaccination course', 'other', 'health', null, true, 'Vaccination course',
   '[starter] Starting suggestion — edit, price or deactivate.', 60),
  ('microchip', 'Microchip', 'other', 'health', null, true, 'Microchip',
   '[starter] Starting suggestion — edit, price or deactivate.', 70),
  ('delivery_travel', 'Delivery / travel', 'delivery', 'logistics', null, true, 'Delivery / travel',
   '[starter] Starting suggestion — edit, price or deactivate.', 80),
  ('collection_kennel', 'Collection from kennel', 'delivery', 'logistics', null, true,
   'Collection from kennel',
   '[starter] Starting suggestion — edit, price or deactivate.', 90),
  ('puppy_starter_pack', 'Puppy starter pack', 'accessory', 'accessory', null, true,
   'Puppy starter pack',
   '[starter] Starting suggestion — edit, price or deactivate.', 100),
  ('board_train', 'Board & train', 'board_train', 'training', null, true, 'Board & train',
   '[starter] Starting suggestion — edit, price or deactivate.', 110),
  ('private_training', 'Private training session', 'training', 'training', null, true,
   'Private training session',
   '[starter] Starting suggestion — edit, price or deactivate.', 120)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- Delivery decision on quotes (+ invoices for convert carry-over)
-- Back-fill stays null — existing quotes (e.g. DD-1135) remain undecided.
-- ---------------------------------------------------------------------------
alter table public.quotes
  add column if not exists delivery_decision text
    check (delivery_decision is null or delivery_decision in
      ('collection','included','charged','to_be_confirmed','not_applicable')),
  add column if not exists delivery_note text;

alter table public.invoices
  add column if not exists delivery_decision text
    check (delivery_decision is null or delivery_decision in
      ('collection','included','charged','to_be_confirmed','not_applicable')),
  add column if not exists delivery_note text;

alter table public.quote_items
  add column if not exists catalogue_code text;

alter table public.invoice_items
  add column if not exists catalogue_code text;

create index if not exists quote_items_catalogue_code_idx
  on public.quote_items(catalogue_code)
  where catalogue_code is not null;

-- ---------------------------------------------------------------------------
-- convert_quote_to_invoice — carry catalogue_code + delivery fields
-- ---------------------------------------------------------------------------
create or replace function public.convert_quote_to_invoice(p_quote_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote quotes;
  v_invoice_id uuid;
begin
  if not is_admin() then
    raise exception 'Not authorised to convert quotes';
  end if;

  select * into v_quote from quotes where id = p_quote_id for update;
  if v_quote.id is null then
    raise exception 'Quote not found';
  end if;
  if v_quote.converted_invoice_id is not null then
    raise exception 'Quote has already been converted to an invoice';
  end if;
  if v_quote.status not in ('sent', 'accepted') then
    raise exception 'Only sent or accepted quotes can be converted to an invoice';
  end if;

  insert into invoices (
    client_id, historical_client_name, quote_id, status, currency,
    subtotal, discount_amount, total_amount, amount_paid, notes,
    issue_date, due_date, created_by, invoice_number,
    delivery_decision, delivery_note
  ) values (
    v_quote.client_id, v_quote.historical_client_name, v_quote.id, 'draft', v_quote.currency,
    v_quote.subtotal, v_quote.discount, v_quote.total, 0, v_quote.notes,
    current_date, v_quote.valid_until, v_quote.created_by, '',
    v_quote.delivery_decision, v_quote.delivery_note
  ) returning id into v_invoice_id;

  insert into invoice_items (
    invoice_id, item_type, description, quantity, unit_price, sort_order, catalogue_code
  )
  select
    v_invoice_id,
    case qi.item_type
      when 'dog' then 'dog_sale'
      when 'training' then 'training_fee'
      when 'board_train' then 'training_fee'
      when 'delivery' then 'transport'
      when 'transport' then 'transport'
      else 'other'
    end,
    qi.description,
    qi.quantity,
    qi.unit_price,
    qi.sort_order,
    qi.catalogue_code
  from quote_items qi
  where qi.quote_id = v_quote.id;

  update quotes
  set status = 'accepted', converted_invoice_id = v_invoice_id, updated_at = now()
  where id = v_quote.id;

  return v_invoice_id;
end;
$$;

grant execute on function public.convert_quote_to_invoice(uuid) to authenticated;
