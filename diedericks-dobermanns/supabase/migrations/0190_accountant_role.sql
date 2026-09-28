-- 0190 — Accountant role: finance read/export only.
--
-- The register shows a client name because an invoice is meaningless without
-- it. It must not become a back door to the client list. Accountant is not
-- granted SELECT on contacts, applications, users (other people), dogs,
-- litters, or storage. Invoices and expenses are read through views that
-- carry only the register fields.

alter table public.users drop constraint if exists users_role_check;

alter table public.users
  add constraint users_role_check
  check (role in ('visitor', 'client', 'trainer', 'admin', 'super_admin', 'accountant'));

create or replace function public.is_finance_reader()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid()
      and role in ('admin', 'super_admin', 'accountant')
  );
$$;

revoke all on function public.is_finance_reader() from public, anon;
grant execute on function public.is_finance_reader() to authenticated, service_role;

-- security_invoker = false: the view runs as its owner and does not require
-- the caller to SELECT invoices or users. The WHERE clause is the gate.

create or replace view public.accountant_sales_register
with (security_invoker = false) as
select
  i.id,
  i.invoice_number,
  i.issue_date,
  i.due_date,
  coalesce(nullif(trim(u.full_name), ''), nullif(trim(i.historical_client_name), ''), '') as client_name,
  coalesce(nullif(trim(u.country), ''), '') as country,
  coalesce(nullif(trim(u.email), ''), '') as client_email,
  i.subtotal,
  coalesce(i.tax_amount, 0) as tax_amount,
  i.total_amount,
  i.amount_paid,
  coalesce(i.amount_outstanding, 0) as amount_outstanding,
  i.status,
  i.sent_at
from public.invoices i
left join public.users u on u.id = i.client_id
where public.is_finance_reader();

create or replace view public.accountant_sales_register_lines
with (security_invoker = false) as
select
  li.id,
  li.invoice_id,
  i.invoice_number,
  li.description,
  li.item_type,
  li.quantity,
  li.unit_price,
  coalesce(li.line_total, 0) as line_total,
  li.sort_order
from public.invoice_items li
join public.invoices i on i.id = li.invoice_id
where public.is_finance_reader();

create or replace view public.accountant_purchase_register
with (security_invoker = false) as
select
  e.id,
  coalesce(nullif(trim(e.supplier_name), ''), nullif(trim(e.creditor_name), ''), '') as supplier_name,
  coalesce(nullif(trim(e.invoice_reference), ''), '') as invoice_reference,
  e.expense_date,
  coalesce(c.name, 'Other') as category_name,
  e.allocation_type,
  e.amount as net,
  coalesce(e.vat_amount, 0) as vat,
  coalesce(e.amount_gross, e.amount + coalesce(e.vat_amount, 0)) as total,
  (e.receipt_url is not null and length(e.receipt_url) > 0) as receipt_attached,
  e.description
from public.expenses e
left join public.expense_categories c on c.id = e.category_id
where public.is_finance_reader();

create or replace view public.accountant_purchase_register_lines
with (security_invoker = false) as
select
  l.id,
  l.expense_id,
  l.description,
  l.quantity,
  l.unit_amount,
  l.line_amount,
  coalesce(l.vat_amount, 0) as vat_amount,
  l.allocation_kind,
  l.sort_order
from public.expense_lines l
where public.is_finance_reader();

comment on view public.accountant_sales_register is
  'Invoice register for finance readers. Name and country only — no address, phone, or documents.';
comment on view public.accountant_purchase_register is
  'Supplier invoice register. Receipt is a boolean; the file is not exposed.';

revoke all on public.accountant_sales_register from public, anon;
revoke all on public.accountant_sales_register_lines from public, anon;
revoke all on public.accountant_purchase_register from public, anon;
revoke all on public.accountant_purchase_register_lines from public, anon;

grant select on public.accountant_sales_register to authenticated, service_role;
grant select on public.accountant_sales_register_lines to authenticated, service_role;
grant select on public.accountant_purchase_register to authenticated, service_role;
grant select on public.accountant_purchase_register_lines to authenticated, service_role;

-- Accountant is not added to is_admin(). Existing invoice/expense write
-- policies stay admin-only. No new INSERT/UPDATE/DELETE policies.

notify pgrst, 'reload schema';
