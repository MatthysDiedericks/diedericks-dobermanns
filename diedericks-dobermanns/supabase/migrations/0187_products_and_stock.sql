-- 0187 — Products and a real stock ledger
--
-- catalogue_items is a quote price list of services and fees. It is not
-- inventory. This migration splits physical products into their own tables
-- and gives every count a cause you can point at.
--
-- Quantity on hand is sum(stock_movements.quantity). It is never a column
-- anyone can edit. A wrong count is a visible adjustment, not an overwrite.
--
-- Confirming a goods-received voucher writes the movements. A draft moves
-- nothing. A confirmed receipt cannot be edited — reverse it with a
-- counter-receipt so the ledger stays append-only.
--
-- security_invoker = true (the value is true, not on).

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  category text not null
    check (category in (
      'feed', 'supplement', 'collar_lead', 'training_equipment',
      'apparel', 'starter_pack', 'other'
    )),
  unit text not null
    check (unit in ('each', 'kg', 'bag', 'pack')),
  cost_price numeric(12, 2) not null default 0,
  sell_price numeric(12, 2) not null default 0,
  vat_rate numeric(5, 2) not null default 15,
  reorder_level integer not null default 0,
  image_path text,
  short_description text,
  is_client_visible boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create index if not exists products_active_idx
  on public.products (is_active, category, sku);
create index if not exists products_shop_idx
  on public.products (is_active, is_client_visible)
  where is_active and is_client_visible;

comment on table public.products is
  'Physical goods with a count. Quantity on hand lives in stock_movements, not here.';

alter table public.products enable row level security;
revoke all on public.products from anon, public;
grant select, insert, update, delete on public.products to authenticated, service_role;

drop policy if exists products_admin on public.products;
create policy products_admin on public.products
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists products_client_read_shop on public.products;
create policy products_client_read_shop on public.products
  for select using (is_active and is_client_visible);

drop trigger if exists trg_products_updated on public.products;
create trigger trg_products_updated
  before update on public.products
  for each row execute function public.set_updated_at();

select public.enable_audit('products');

-- ---------------------------------------------------------------------------
-- stock_movements — append-only ledger
-- ---------------------------------------------------------------------------
create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  movement_type text not null
    check (movement_type in (
      'receive', 'sale', 'adjustment', 'write_off', 'internal_use', 'return'
    )),
  quantity numeric(12, 4) not null
    check (quantity <> 0),
  unit_cost numeric(12, 2),
  reason text,
  occurred_at timestamptz not null default now(),
  receipt_id uuid,
  invoice_id uuid references public.invoices(id) on delete set null,
  dog_id uuid references public.dogs(id) on delete set null,
  litter_id uuid references public.litters(id) on delete set null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  constraint stock_movements_receive_positive check (
    movement_type <> 'receive' or quantity > 0
  ),
  constraint stock_movements_sale_negative check (
    movement_type <> 'sale' or quantity < 0
  ),
  constraint stock_movements_return_positive check (
    movement_type <> 'return' or quantity > 0
  ),
  constraint stock_movements_out_negative check (
    movement_type not in ('write_off', 'internal_use') or quantity < 0
  )
);

create index if not exists stock_movements_product_idx
  on public.stock_movements (product_id, occurred_at desc);
create index if not exists stock_movements_receipt_idx
  on public.stock_movements (receipt_id)
  where receipt_id is not null;
create index if not exists stock_movements_invoice_idx
  on public.stock_movements (invoice_id)
  where invoice_id is not null;

comment on table public.stock_movements is
  'Append-only stock ledger. quantity is signed: + in, - out. Never update a row; correct with a new movement.';

alter table public.stock_movements enable row level security;
revoke all on public.stock_movements from anon, public;
grant select, insert on public.stock_movements to authenticated, service_role;

drop policy if exists stock_movements_admin_select on public.stock_movements;
create policy stock_movements_admin_select on public.stock_movements
  for select using (public.is_admin());

drop policy if exists stock_movements_admin_insert on public.stock_movements;
create policy stock_movements_admin_insert on public.stock_movements
  for insert with check (public.is_admin());

create or replace function public.stock_movements_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'stock_movements is append-only. Correct a count with a new adjustment, do not edit the ledger.';
end;
$$;

drop trigger if exists trg_stock_movements_no_update on public.stock_movements;
create trigger trg_stock_movements_no_update
  before update or delete on public.stock_movements
  for each row execute function public.stock_movements_append_only();

-- ---------------------------------------------------------------------------
-- stock_receipts (GRV) + lines
-- ---------------------------------------------------------------------------
create table if not exists public.stock_receipts (
  id uuid primary key default gen_random_uuid(),
  supplier_name text not null,
  supplier_invoice_no text,
  received_on date not null default current_date,
  total_amount numeric(12, 2) not null default 0,
  notes text,
  expense_id uuid references public.expenses(id) on delete set null,
  status text not null default 'draft'
    check (status in ('draft', 'confirmed')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- Confirming writes the movements. A confirmed receipt cannot be edited:
-- the ledger would silently change if a line could be rewritten after the
-- receive movements already exist. Reverse with a counter-receipt instead.
comment on table public.stock_receipts is
  'Goods received voucher. Draft moves nothing. Confirming writes stock_movements and posts the expense. Confirmed rows are immutable.';

create table if not exists public.stock_receipt_lines (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references public.stock_receipts(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity numeric(12, 4) not null check (quantity > 0),
  unit_cost numeric(12, 2) not null,
  line_total numeric(12, 2) not null
);

create index if not exists stock_receipts_supplier_idx
  on public.stock_receipts (supplier_name, received_on desc);
create index if not exists stock_receipt_lines_receipt_idx
  on public.stock_receipt_lines (receipt_id);

alter table public.stock_movements
  drop constraint if exists stock_movements_receipt_id_fkey;
alter table public.stock_movements
  add constraint stock_movements_receipt_id_fkey
  foreign key (receipt_id) references public.stock_receipts(id) on delete set null;

alter table public.stock_receipts enable row level security;
alter table public.stock_receipt_lines enable row level security;
revoke all on public.stock_receipts from anon, public;
revoke all on public.stock_receipt_lines from anon, public;
grant select, insert, update, delete on public.stock_receipts to authenticated, service_role;
grant select, insert, update, delete on public.stock_receipt_lines to authenticated, service_role;

drop policy if exists stock_receipts_admin on public.stock_receipts;
create policy stock_receipts_admin on public.stock_receipts
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists stock_receipt_lines_admin on public.stock_receipt_lines;
create policy stock_receipt_lines_admin on public.stock_receipt_lines
  for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.stock_receipts_freeze_confirmed()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    if old.status = 'confirmed' then
      raise exception 'A confirmed receipt cannot be edited. Reverse it with a counter-receipt.';
    end if;
    return old;
  end if;
  if old.status = 'confirmed' then
    raise exception 'A confirmed receipt cannot be edited. Reverse it with a counter-receipt.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_stock_receipts_freeze on public.stock_receipts;
create trigger trg_stock_receipts_freeze
  before update or delete on public.stock_receipts
  for each row execute function public.stock_receipts_freeze_confirmed();

create or replace function public.stock_receipt_lines_freeze_confirmed()
returns trigger
language plpgsql
as $$
declare
  v_status text;
  v_receipt uuid;
begin
  v_receipt := coalesce(new.receipt_id, old.receipt_id);
  select status into v_status from public.stock_receipts where id = v_receipt;
  if v_status = 'confirmed' then
    raise exception 'A confirmed receipt cannot be edited. Reverse it with a counter-receipt.';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_stock_receipt_lines_freeze on public.stock_receipt_lines;
create trigger trg_stock_receipt_lines_freeze
  before insert or update or delete on public.stock_receipt_lines
  for each row execute function public.stock_receipt_lines_freeze_confirmed();

select public.enable_audit('stock_receipts');

-- ---------------------------------------------------------------------------
-- Quantity on hand is the sum of the ledger. Never store it on products.
-- ---------------------------------------------------------------------------
create or replace view public.v_product_stock
with (security_invoker = true) as
select p.*,
       coalesce(sum(m.quantity), 0)                    as qty_on_hand,
       coalesce(sum(m.quantity), 0) <= p.reorder_level as needs_reorder
from public.products p
left join public.stock_movements m on m.product_id = p.id
group by p.id;

grant select on public.v_product_stock to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Shop / money join: product_id on quote and invoice lines
-- ---------------------------------------------------------------------------
alter table public.quote_items
  add column if not exists product_id uuid references public.products(id) on delete set null;
alter table public.invoice_items
  add column if not exists product_id uuid references public.products(id) on delete set null;

create index if not exists quote_items_product_idx
  on public.quote_items (product_id)
  where product_id is not null;
create index if not exists invoice_items_product_idx
  on public.invoice_items (product_id)
  where product_id is not null;

-- Carry product_id when a quote becomes an invoice.
create or replace function public.convert_quote_to_invoice(p_quote_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_quote quotes;
  v_invoice_id uuid;
  v_dog uuid;
  v_litter uuid;
  v_client uuid;
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
  if v_quote.contact_id is null and v_quote.client_id is null then
    raise exception 'Link a buyer before converting this quote to an invoice';
  end if;

  v_client := coalesce(
    v_quote.client_id,
    public.portal_account_id_for_contact(v_quote.contact_id)
  );

  select qi.dog_id into v_dog
    from quote_items qi where qi.quote_id = v_quote.id and qi.dog_id is not null
    order by qi.sort_order limit 1;
  select qi.litter_id into v_litter
    from quote_items qi where qi.quote_id = v_quote.id and qi.litter_id is not null
    order by qi.sort_order limit 1;

  insert into invoices (
    client_id, historical_client_name, quote_id, status, currency,
    subtotal, discount_amount, total_amount, amount_paid,
    notes, issue_date, due_date, created_by, invoice_number,
    delivery_decision, delivery_note, dog_id, litter_id, invoice_type
  ) values (
    v_client, v_quote.historical_client_name, v_quote.id, 'sent', v_quote.currency,
    v_quote.subtotal, v_quote.discount, v_quote.total, 0,
    v_quote.notes, current_date, v_quote.valid_until, v_quote.created_by, '',
    v_quote.delivery_decision, v_quote.delivery_note, v_dog, v_litter,
    coalesce(v_quote.quote_type, 'dog_sale')
  ) returning id into v_invoice_id;

  insert into invoice_items (
    invoice_id, item_type, description, quantity, unit_price, sort_order,
    catalogue_code, product_id
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
    qi.description, qi.quantity, qi.unit_price, qi.sort_order,
    qi.catalogue_code, qi.product_id
  from quote_items qi
  where qi.quote_id = v_quote.id;

  update quotes
     set status = 'accepted', converted_invoice_id = v_invoice_id, updated_at = now()
   where id = v_quote.id;

  update waiting_list
     set deposit_invoice_id = v_invoice_id,
         balance_invoice_id = v_invoice_id,
         quote_id = v_quote.id,
         updated_at = now()
   where quote_id = v_quote.id
      or (v_quote.application_id is not null and application_id = v_quote.application_id);

  return v_invoice_id;
end;
$$;

grant execute on function public.convert_quote_to_invoice(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Confirm a receipt: movements + expense in one transaction.
-- Allocations are computed in TypeScript (resolveAllocations.ts) and passed in.
-- ---------------------------------------------------------------------------
create or replace function public.confirm_stock_receipt(
  p_receipt_id uuid,
  p_expense jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_receipt public.stock_receipts%rowtype;
  v_line public.stock_receipt_lines%rowtype;
  v_expense_id uuid;
  v_line_id uuid;
  v_item_count integer := 0;
  v_qty_total numeric(12, 4) := 0;
  v_exp jsonb;
  v_el jsonb;
  v_al jsonb;
  v_header numeric(12, 2);
  v_lines_sum numeric(12, 2) := 0;
  v_alloc_sum numeric(12, 2);
begin
  if not public.is_admin() then
    raise exception 'Not authorised to confirm a stock receipt';
  end if;

  select * into v_receipt
    from public.stock_receipts
   where id = p_receipt_id
   for update;
  if v_receipt.id is null then
    raise exception 'Receipt not found';
  end if;

  if v_receipt.status = 'confirmed' then
    select coalesce(sum(quantity), 0), count(*)
      into v_qty_total, v_item_count
      from public.stock_receipt_lines
     where receipt_id = p_receipt_id;
    return jsonb_build_object(
      'ok', true,
      'already_confirmed', true,
      'receipt_id', v_receipt.id,
      'expense_id', v_receipt.expense_id,
      'item_count', v_item_count,
      'quantity_total', v_qty_total,
      'total', v_receipt.total_amount
    );
  end if;

  if v_receipt.status <> 'draft' then
    raise exception 'Only a draft receipt can be confirmed';
  end if;

  select count(*), coalesce(sum(quantity), 0)
    into v_item_count, v_qty_total
    from public.stock_receipt_lines
   where receipt_id = p_receipt_id;
  if v_item_count = 0 then
    raise exception 'A receipt needs at least one line';
  end if;

  for v_line in
    select * from public.stock_receipt_lines where receipt_id = p_receipt_id
  loop
    insert into public.stock_movements (
      product_id, movement_type, quantity, unit_cost, reason, occurred_at,
      receipt_id, created_by
    ) values (
      v_line.product_id,
      'receive',
      v_line.quantity,
      v_line.unit_cost,
      'Goods received',
      v_receipt.received_on::timestamptz,
      v_receipt.id,
      auth.uid()
    );
  end loop;

  v_exp := p_expense;
  v_header := coalesce((v_exp->>'amount')::numeric, v_receipt.total_amount);

  insert into public.expenses (
    category_id,
    description,
    amount,
    expense_date,
    supplier_name,
    invoice_reference,
    allocation_type,
    dog_id,
    litter_id,
    notes,
    price_excl_vat,
    vat_applicable,
    vat_rate,
    vat_amount,
    recorded_by
  ) values (
    nullif(v_exp->>'category_id', '')::uuid,
    coalesce(nullif(v_exp->>'description', ''), 'Stock received — ' || v_receipt.supplier_name),
    v_header,
    coalesce(nullif(v_exp->>'expense_date', ''), v_receipt.received_on::text)::date,
    v_receipt.supplier_name,
    v_receipt.supplier_invoice_no,
    coalesce(nullif(v_exp->>'allocation_type', ''), 'company'),
    nullif(v_exp->>'dog_id', '')::uuid,
    nullif(v_exp->>'litter_id', '')::uuid,
    v_exp->>'notes',
    coalesce((v_exp->>'price_excl_vat')::numeric, v_header),
    coalesce((v_exp->>'vat_applicable')::boolean, false),
    coalesce((v_exp->>'vat_rate')::numeric, 0),
    coalesce((v_exp->>'vat_amount')::numeric, 0),
    auth.uid()
  ) returning id into v_expense_id;

  for v_el in select * from jsonb_array_elements(coalesce(v_exp->'lines', '[]'::jsonb))
  loop
    v_lines_sum := v_lines_sum + coalesce((v_el->>'line_amount')::numeric, 0);
    insert into public.expense_lines (
      expense_id,
      description,
      quantity,
      unit_amount,
      line_amount,
      vat_rate,
      vat_amount,
      category_id,
      allocation_kind,
      sort_order
    ) values (
      v_expense_id,
      coalesce(v_el->>'description', 'Stock line'),
      coalesce((v_el->>'quantity')::numeric, 1),
      (v_el->>'unit_amount')::numeric,
      (v_el->>'line_amount')::numeric,
      (v_el->>'vat_rate')::numeric,
      coalesce((v_el->>'vat_amount')::numeric, 0),
      coalesce(nullif(v_el->>'category_id', '')::uuid, nullif(v_exp->>'category_id', '')::uuid),
      coalesce(v_el->>'allocation_kind', v_exp->>'allocation_type', 'company'),
      coalesce((v_el->>'sort_order')::int, 0)
    ) returning id into v_line_id;

    v_alloc_sum := 0;
    for v_al in select * from jsonb_array_elements(coalesce(v_el->'allocations', '[]'::jsonb))
    loop
      v_alloc_sum := v_alloc_sum + coalesce((v_al->>'amount')::numeric, 0);
      insert into public.expense_allocations (
        expense_line_id, dog_id, litter_id, amount, weight, basis_note
      ) values (
        v_line_id,
        nullif(v_al->>'dog_id', '')::uuid,
        nullif(v_al->>'litter_id', '')::uuid,
        (v_al->>'amount')::numeric,
        coalesce((v_al->>'weight')::numeric, 1),
        v_al->>'basis_note'
      );
    end loop;

    if coalesce(v_el->>'allocation_kind', v_exp->>'allocation_type', 'company') <> 'company'
       and round(v_alloc_sum, 2) <> round(coalesce((v_el->>'line_amount')::numeric, 0), 2) then
      raise exception 'Allocations for a line must sum to the line total';
    end if;
  end loop;

  if round(v_lines_sum, 2) <> round(v_header, 2) then
    raise exception 'Expense lines must sum to the receipt total';
  end if;

  -- Freeze trigger only blocks when OLD.status is already confirmed, so
  -- draft → confirmed is the one write it must allow.
  update public.stock_receipts
     set status = 'confirmed',
         expense_id = v_expense_id,
         total_amount = v_header
   where id = p_receipt_id
     and status = 'draft';
  if not found then
    raise exception 'Receipt was confirmed by someone else';
  end if;

  return jsonb_build_object(
    'ok', true,
    'already_confirmed', false,
    'receipt_id', p_receipt_id,
    'expense_id', v_expense_id,
    'item_count', v_item_count,
    'quantity_total', v_qty_total,
    'total', v_header
  );
end;
$$;

grant execute on function public.confirm_stock_receipt(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Sales reduce stock. Nothing goes negative without an explicit override.
-- An override writes an adjustment (the missing units) then the sale, so
-- the ledger shows why, rather than a silent negative number.
-- ---------------------------------------------------------------------------
create or replace function public.product_qty_on_hand(p_product_id uuid)
returns numeric
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(sum(quantity), 0) from public.stock_movements where product_id = p_product_id;
$$;

grant execute on function public.product_qty_on_hand(uuid) to authenticated;

create or replace function public.post_invoice_product_stock(
  p_invoice_id uuid,
  p_allow_negative boolean default false,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item record;
  v_on_hand numeric(12, 4);
  v_need numeric(12, 4);
  v_cost numeric(12, 2);
  v_posted integer := 0;
begin
  if exists (
    select 1 from public.stock_movements
     where invoice_id = p_invoice_id and movement_type = 'sale'
  ) then
    return jsonb_build_object('ok', true, 'already_posted', true, 'posted', 0);
  end if;

  for v_item in
    select ii.id, ii.product_id, ii.quantity, ii.description
      from public.invoice_items ii
     where ii.invoice_id = p_invoice_id
       and ii.product_id is not null
  loop
    v_need := v_item.quantity;
    if v_need <= 0 then
      continue;
    end if;
    v_on_hand := public.product_qty_on_hand(v_item.product_id);
    select cost_price into v_cost from public.products where id = v_item.product_id;

    if v_on_hand - v_need < 0 and not coalesce(p_allow_negative, false) then
      raise exception 'STOCK_WOULD_GO_NEGATIVE'
        using errcode = 'P0001',
              hint = v_item.product_id::text;
    end if;

    if v_on_hand - v_need < 0 and coalesce(p_allow_negative, false) then
      insert into public.stock_movements (
        product_id, movement_type, quantity, unit_cost, reason, invoice_id, created_by
      ) values (
        v_item.product_id,
        'adjustment',
        v_need - v_on_hand,
        v_cost,
        coalesce(nullif(p_reason, ''), 'Override: sold more than on hand'),
        p_invoice_id,
        auth.uid()
      );
    end if;

    insert into public.stock_movements (
      product_id, movement_type, quantity, unit_cost, reason, invoice_id, created_by
    ) values (
      v_item.product_id,
      'sale',
      -v_need,
      v_cost,
      coalesce(nullif(p_reason, ''), 'Invoice sale'),
      p_invoice_id,
      auth.uid()
    );
    v_posted := v_posted + 1;
  end loop;

  return jsonb_build_object('ok', true, 'already_posted', false, 'posted', v_posted);
end;
$$;

grant execute on function public.post_invoice_product_stock(uuid, boolean, text) to authenticated;

create or replace function public.reverse_invoice_product_stock(p_invoice_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.stock_movements%rowtype;
  v_reversed integer := 0;
begin
  if exists (
    select 1 from public.stock_movements
     where invoice_id = p_invoice_id and movement_type = 'return'
  ) then
    return jsonb_build_object('ok', true, 'already_reversed', true, 'reversed', 0);
  end if;

  for v_row in
    select * from public.stock_movements
     where invoice_id = p_invoice_id and movement_type = 'sale'
  loop
    insert into public.stock_movements (
      product_id, movement_type, quantity, unit_cost, reason, invoice_id, created_by
    ) values (
      v_row.product_id,
      'return',
      -v_row.quantity,
      v_row.unit_cost,
      'Invoice reversed',
      p_invoice_id,
      auth.uid()
    );
    v_reversed := v_reversed + 1;
  end loop;

  for v_row in
    select * from public.stock_movements
     where invoice_id = p_invoice_id
       and movement_type = 'adjustment'
       and reason ilike 'Override:%'
  loop
    insert into public.stock_movements (
      product_id, movement_type, quantity, unit_cost, reason, invoice_id, created_by
    ) values (
      v_row.product_id,
      'adjustment',
      -v_row.quantity,
      v_row.unit_cost,
      'Reverse override for cancelled invoice',
      p_invoice_id,
      auth.uid()
    );
  end loop;

  return jsonb_build_object('ok', true, 'already_reversed', false, 'reversed', v_reversed);
end;
$$;

grant execute on function public.reverse_invoice_product_stock(uuid) to authenticated;

create or replace function public.record_stock_adjustment(
  p_product_id uuid,
  p_quantity numeric,
  p_reason text,
  p_allow_negative boolean default false,
  p_dog_id uuid default null,
  p_litter_id uuid default null,
  p_movement_type text default 'adjustment'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_on_hand numeric(12, 4);
  v_type text;
  v_cost numeric(12, 2);
begin
  if not public.is_admin() then
    raise exception 'Not authorised to adjust stock';
  end if;
  if p_quantity = 0 then
    raise exception 'Adjustment quantity cannot be zero';
  end if;
  if coalesce(nullif(p_reason, ''), '') = '' then
    raise exception 'An adjustment needs a reason';
  end if;

  v_type := coalesce(nullif(p_movement_type, ''), 'adjustment');
  if v_type not in ('adjustment', 'write_off', 'internal_use') then
    raise exception 'Invalid adjustment type';
  end if;

  v_on_hand := public.product_qty_on_hand(p_product_id);
  if v_on_hand + p_quantity < 0 and not coalesce(p_allow_negative, false) then
    raise exception 'STOCK_WOULD_GO_NEGATIVE'
      using errcode = 'P0001',
            hint = p_product_id::text;
  end if;

  select cost_price into v_cost from public.products where id = p_product_id;

  insert into public.stock_movements (
    product_id, movement_type, quantity, unit_cost, reason, dog_id, litter_id, created_by
  ) values (
    p_product_id, v_type, p_quantity, v_cost, p_reason, p_dog_id, p_litter_id, auth.uid()
  );

  return jsonb_build_object(
    'ok', true,
    'qty_on_hand', public.product_qty_on_hand(p_product_id)
  );
end;
$$;

grant execute on function public.record_stock_adjustment(uuid, numeric, text, boolean, uuid, uuid, text) to authenticated;

create or replace function public.trg_invoice_product_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status in ('paid', 'delivered')
     and old.status is distinct from new.status then
    perform public.post_invoice_product_stock(new.id, false, null);
  end if;
  if new.status in ('cancelled', 'void')
     and old.status in ('paid', 'delivered') then
    perform public.reverse_invoice_product_stock(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_invoice_product_stock on public.invoices;
create trigger trg_invoice_product_stock
  after update of status on public.invoices
  for each row execute function public.trg_invoice_product_stock();

-- ---------------------------------------------------------------------------
-- catalogue_items: drop inventory language. No data is lost — every live row
-- is stock_status = in_stock and equipment_type is null.
-- ---------------------------------------------------------------------------
alter table public.catalogue_items
  drop constraint if exists catalogue_items_stock_status_check;
alter table public.catalogue_items
  drop constraint if exists catalogue_items_equipment_type_fkey;
alter table public.catalogue_items
  drop column if exists stock_status;
alter table public.catalogue_items
  drop column if exists equipment_type;

notify pgrst, 'reload schema';
