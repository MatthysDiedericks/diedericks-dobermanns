-- 0064 — Quote & invoice line-item totals are authoritative in the database.
-- Also: signup_failures for silent registration failures (domain + error code only).

-- ---------------------------------------------------------------------------
-- Quote totals: keep quotes.subtotal / quotes.total in sync with quote_items
-- ---------------------------------------------------------------------------
create or replace function public.recalc_quote_totals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  q uuid;
  v_subtotal numeric(12,2);
  v_discount numeric(12,2);
begin
  q := coalesce(new.quote_id, old.quote_id);
  if q is null then
    return null;
  end if;

  select coalesce(sum(quantity * unit_price), 0)
    into v_subtotal
    from public.quote_items
   where quote_id = q;

  select coalesce(discount, 0)
    into v_discount
    from public.quotes
   where id = q;

  update public.quotes
     set subtotal = v_subtotal,
         total = greatest(v_subtotal - v_discount, 0),
         updated_at = now()
   where id = q;

  return null;
end;
$$;

drop trigger if exists trg_quote_items_recalc on public.quote_items;
create trigger trg_quote_items_recalc
after insert or update or delete on public.quote_items
for each row execute function public.recalc_quote_totals();

-- When discount changes on the quote header, recalc total from current lines.
create or replace function public.recalc_quote_totals_on_discount()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subtotal numeric(12,2);
begin
  if tg_op = 'UPDATE' and new.discount is not distinct from old.discount then
    return new;
  end if;

  select coalesce(sum(quantity * unit_price), 0)
    into v_subtotal
    from public.quote_items
   where quote_id = new.id;

  new.subtotal := v_subtotal;
  new.total := greatest(v_subtotal - coalesce(new.discount, 0), 0);
  return new;
end;
$$;

drop trigger if exists trg_quotes_recalc_on_discount on public.quotes;
create trigger trg_quotes_recalc_on_discount
before update of discount on public.quotes
for each row execute function public.recalc_quote_totals_on_discount();

-- ---------------------------------------------------------------------------
-- Invoice totals: mirror payments' trg_sync_invoice_payment_totals pattern
-- Live columns: subtotal, discount_amount, total_amount
-- ---------------------------------------------------------------------------
create or replace function public.recalc_invoice_totals()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  inv uuid;
  v_subtotal numeric(12,2);
  v_discount numeric(12,2);
  v_total numeric(12,2);
  v_paid numeric(12,2);
begin
  inv := coalesce(new.invoice_id, old.invoice_id);
  if inv is null then
    return null;
  end if;

  select coalesce(sum(quantity * unit_price), 0)
    into v_subtotal
    from public.invoice_items
   where invoice_id = inv;

  select coalesce(discount_amount, 0), coalesce(amount_paid, 0)
    into v_discount, v_paid
    from public.invoices
   where id = inv;

  v_total := greatest(v_subtotal - v_discount, 0);

  update public.invoices
     set subtotal = v_subtotal,
         total_amount = v_total,
         amount_outstanding = greatest(v_total - v_paid, 0),
         updated_at = now()
   where id = inv;

  return null;
end;
$$;

drop trigger if exists trg_invoice_items_recalc on public.invoice_items;
create trigger trg_invoice_items_recalc
after insert or update or delete on public.invoice_items
for each row execute function public.recalc_invoice_totals();

create or replace function public.recalc_invoice_totals_on_discount()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subtotal numeric(12,2);
  v_total numeric(12,2);
begin
  if tg_op = 'UPDATE'
     and new.discount_amount is not distinct from old.discount_amount then
    return new;
  end if;

  select coalesce(sum(quantity * unit_price), 0)
    into v_subtotal
    from public.invoice_items
   where invoice_id = new.id;

  v_total := greatest(v_subtotal - coalesce(new.discount_amount, 0), 0);
  new.subtotal := v_subtotal;
  new.total_amount := v_total;
  new.amount_outstanding := greatest(v_total - coalesce(new.amount_paid, 0), 0);
  return new;
end;
$$;

drop trigger if exists trg_invoices_recalc_on_discount on public.invoices;
create trigger trg_invoices_recalc_on_discount
before update of discount_amount on public.invoices
for each row execute function public.recalc_invoice_totals_on_discount();

-- Do NOT revoke EXECUTE from PUBLIC on these functions.
-- That caused a 6.7-hour outage on this project in July 2025.

-- ---------------------------------------------------------------------------
-- signup_failures — visible registration failures (no password, no full email)
-- ---------------------------------------------------------------------------
create table if not exists public.signup_failures (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  error_code text not null,
  email_domain text not null
);

create index if not exists idx_signup_failures_created
  on public.signup_failures (created_at desc);

alter table public.signup_failures enable row level security;

drop policy if exists "signup_failures insert anyone" on public.signup_failures;
create policy "signup_failures insert anyone"
  on public.signup_failures
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "signup_failures admin read" on public.signup_failures;
create policy "signup_failures admin read"
  on public.signup_failures
  for select
  to authenticated
  using (public.is_admin());

-- No update/delete policies — history is append-only.
