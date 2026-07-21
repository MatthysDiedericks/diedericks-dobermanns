-- Real quotes + quote_items schema, backing the already-built quote builder UI
-- (app/(admin)/quotes/*), which has been silently falling back to MOCK_QUOTES
-- because these tables never existed. Mirrors the `invoices` pattern exactly:
-- nullable `client_id` + `historical_client_name` text fallback for walk-in
-- clients with no app account (no check constraint requiring either — invoices
-- doesn't have one either, it's app-layer '—' display logic, see
-- fetchInvoiceById), same RLS shape (admin all / client view own), and a
-- SECURITY DEFINER RPC for the quote -> invoice conversion so a partial
-- failure can never leave a quote marked accepted with no invoice created.

create sequence if not exists quote_number_seq;

create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  quote_number text not null unique,
  client_id uuid references users(id) on delete restrict,
  historical_client_name text,
  application_id uuid references applications(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'declined', 'expired', 'cancelled')),
  currency text not null default 'ZAR',
  subtotal numeric not null default 0,
  discount numeric not null default 0,
  total numeric not null default 0,
  notes text,
  valid_until date,
  converted_invoice_id uuid references invoices(id) on delete set null,
  created_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  item_type text not null,
  dog_id uuid references dogs(id) on delete set null,
  description text not null,
  quantity numeric not null default 1,
  unit_price numeric not null default 0,
  line_total numeric generated always as (quantity * unit_price) stored,
  sort_order int not null default 0
);

alter table invoices add column if not exists quote_id uuid references quotes(id) on delete set null;

-- Auto quote numbering: 'QTE-0001', 'QTE-0002', ... — verified no prior use of
-- a "QTE" prefix anywhere in this schema before picking it.
create or replace function public.assign_quote_number()
returns trigger
language plpgsql
as $$
begin
  if new.quote_number is null or new.quote_number = '' then
    new.quote_number := 'QTE-' || lpad(nextval('quote_number_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_assign_quote_number on quotes;
create trigger trg_assign_quote_number
  before insert on quotes
  for each row execute function public.assign_quote_number();

-- RLS — exact shape of the live `invoices` policies (checked via pg_policies):
-- admins manage everything, clients may only SELECT their own linked rows.
alter table quotes enable row level security;
alter table quote_items enable row level security;

create policy "Admin full access to quotes" on quotes
  for all using (is_admin());

create policy "Client can view own quotes" on quotes
  for select using (client_id = auth.uid());

create policy "Admin full access to quote_items" on quote_items
  for all using (is_admin());

create policy "Client can view own quote items" on quote_items
  for select using (
    exists (select 1 from quotes q where q.id = quote_items.quote_id and q.client_id = auth.uid())
  );

-- Converts a sent/accepted quote into a real invoice (+ items), atomically.
-- Runs as a single function body so a partial failure rolls back everything —
-- never an invoice with no quote_id link, or a quote marked accepted with no
-- invoice. `invoice_items.item_type` has a narrower check constraint than
-- `quote_items.item_type` (dog_sale/deposit/training_fee/transport/other vs.
-- the quote builder's dog/delivery/board_train/training/transport/accessory/
-- other), so line items are remapped to the nearest valid invoice type.
-- Both tables' `line_total` are `generated always as (quantity * unit_price)
-- stored` columns — never included in an insert's column list.
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
    issue_date, due_date, created_by, invoice_number
  ) values (
    v_quote.client_id, v_quote.historical_client_name, v_quote.id, 'draft', v_quote.currency,
    v_quote.subtotal, v_quote.discount, v_quote.total, 0, v_quote.notes,
    current_date, v_quote.valid_until, v_quote.created_by, ''
  ) returning id into v_invoice_id;

  insert into invoice_items (invoice_id, item_type, description, quantity, unit_price, sort_order)
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
    qi.sort_order
  from quote_items qi
  where qi.quote_id = v_quote.id;

  update quotes
  set status = 'accepted', converted_invoice_id = v_invoice_id, updated_at = now()
  where id = v_quote.id;

  return v_invoice_id;
end;
$$;

grant execute on function public.convert_quote_to_invoice(uuid) to authenticated;
