-- 0196 — Which account received the money, cash on hand, and bank statements.
--
-- Existing invoice_payments rows stay unassigned. Do not guess an account
-- for them. A wrong account is worse than a blank one. New inserts must
-- name an account. The bookkeeper's payment register includes cash.
-- It must not grow a filter that drops cash sales.

alter table public.invoice_payments
  add column if not exists payment_account_id uuid references public.payment_accounts(id),
  add column if not exists banked_on date,
  add column if not exists banked_reference text;

comment on column public.invoice_payments.payment_account_id is
  'Which account actually received the money. Cash received in hand points at Petty Cash until it is banked.';
comment on column public.invoice_payments.banked_on is
  'When cash received in hand was deposited. Null means it is still cash on hand.';
comment on column public.invoice_payments.banked_reference is
  'Deposit reference written when cash on hand was banked.';

create index if not exists invoice_payments_account_idx
  on public.invoice_payments (payment_account_id);

create index if not exists invoice_payments_unbanked_idx
  on public.invoice_payments (payment_account_id)
  where banked_on is null;

create or replace function public.invoice_payments_require_account()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.payment_account_id is null then
    raise exception 'A payment must name the account that received it.';
  end if;
  if not exists (
    select 1 from public.payment_accounts
    where id = new.payment_account_id
      and is_active
  ) then
    raise exception 'Choose an active account that received this payment.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_invoice_payments_require_account on public.invoice_payments;
create trigger trg_invoice_payments_require_account
  before insert on public.invoice_payments
  for each row
  execute function public.invoice_payments_require_account();

-- Proof verification inserts a receipt. It has to name the account too.
drop function if exists public.verify_payment_proof(uuid, uuid, numeric, date, text, text);

create or replace function public.verify_payment_proof(
  p_document_id uuid,
  p_invoice_id uuid,
  p_amount numeric,
  p_payment_date date,
  p_method text,
  p_reference text,
  p_payment_account_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_doc documents;
  v_inv invoices;
  v_pay uuid;
begin
  if not is_admin() then
    raise exception 'Not authorised to verify payment proofs';
  end if;
  if coalesce(p_amount, 0) <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;
  if p_payment_account_id is null then
    raise exception 'A payment must name the account that received it.';
  end if;

  select * into v_doc from documents where id = p_document_id for update;
  if v_doc.id is null or v_doc.category is distinct from 'proof_of_payment' then
    raise exception 'Proof of payment not found';
  end if;

  select * into v_inv from invoices where id = p_invoice_id for update;
  if v_inv.id is null then
    raise exception 'Invoice not found';
  end if;
  if v_inv.status in ('void', 'cancelled') then
    raise exception 'Cannot record a payment against a void invoice';
  end if;
  if p_amount > coalesce(v_inv.amount_outstanding, v_inv.total_amount) + 0.009 then
    raise exception 'This payment would exceed the invoice outstanding';
  end if;

  insert into invoice_payments (
    invoice_id, amount, payment_date, payment_method, reference, notes,
    recorded_by, proof_document_id, payment_account_id
  ) values (
    p_invoice_id, p_amount, coalesce(p_payment_date, current_date),
    coalesce(nullif(btrim(p_method), ''), 'eft'), nullif(btrim(p_reference), ''),
    'Verified from proof of payment', auth.uid(), p_document_id, p_payment_account_id
  ) returning id into v_pay;

  update documents
     set review_status = 'verified',
         related_invoice_id = p_invoice_id,
         updated_at = now()
   where id = p_document_id;

  update waiting_list
     set pipeline_stage = 'deposit_paid',
         payment_status = 'deposit_paid',
         deposit_amount = p_amount,
         deposit_paid_date = coalesce(p_payment_date, current_date),
         deposit_invoice_id = p_invoice_id,
         balance_invoice_id = p_invoice_id,
         stage_updated_at = now(),
         stage_updated_by = auth.uid(),
         updated_at = now()
   where deposit_invoice_id = p_invoice_id
      or balance_invoice_id = p_invoice_id
      or (v_inv.quote_id is not null and quote_id = v_inv.quote_id);

  return v_pay;
end;
$$;

revoke all on function public.verify_payment_proof(uuid, uuid, numeric, date, text, text, uuid) from public, anon;
grant execute on function public.verify_payment_proof(uuid, uuid, numeric, date, text, text, uuid)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Bank statements. A statement is filed against a bank account only.
-- PDFs are stored and not parsed. Lines are entered or imported afterwards.
-- ---------------------------------------------------------------------------

create table if not exists public.bank_statements (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.payment_accounts(id),
  period_start date not null,
  period_end date not null,
  opening_balance numeric(14,2) not null,
  closing_balance numeric(14,2) not null,
  document_id uuid references public.documents(id),
  source_kind text not null default 'pdf' check (source_kind in ('pdf', 'csv')),
  uploaded_by uuid references public.users(id),
  uploaded_at timestamptz not null default now(),
  check (period_end >= period_start)
);

create table if not exists public.bank_statement_lines (
  id uuid primary key default gen_random_uuid(),
  statement_id uuid not null references public.bank_statements(id) on delete cascade,
  transaction_date date not null,
  description text,
  reference text,
  amount numeric(14,2) not null,
  matched_payment_id uuid references public.invoice_payments(id) on delete set null,
  matched_expense_id uuid references public.expenses(id) on delete set null,
  match_note text,
  created_at timestamptz not null default now(),
  check (matched_payment_id is null or matched_expense_id is null)
);

create index if not exists bank_statements_account_idx
  on public.bank_statements (account_id, period_start);
create index if not exists bank_statement_lines_statement_idx
  on public.bank_statement_lines (statement_id);

comment on table public.bank_statements is
  'A bank statement for one bank account and period. The file lives in the private bank-statements bucket. Accountant reads lines through a view, not a storage URL.';
comment on table public.bank_statement_lines is
  'One statement transaction. matched_* is set only when a person confirms. Nothing here auto-matches on amount.';

create or replace function public.bank_statement_account_must_be_bank()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_type text;
begin
  select account_type into v_type
    from public.payment_accounts
   where id = new.account_id;
  if v_type is distinct from 'bank' then
    raise exception 'A bank statement can only be filed against a bank account.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_bank_statement_account_must_be_bank on public.bank_statements;
create trigger trg_bank_statement_account_must_be_bank
  before insert or update of account_id on public.bank_statements
  for each row
  execute function public.bank_statement_account_must_be_bank();

alter table public.bank_statements enable row level security;
alter table public.bank_statement_lines enable row level security;

drop policy if exists "bank_statements_admin" on public.bank_statements;
create policy "bank_statements_admin" on public.bank_statements
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "bank_statement_lines_admin" on public.bank_statement_lines;
create policy "bank_statement_lines_admin" on public.bank_statement_lines
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update, delete on public.bank_statements to authenticated, service_role;
grant select, insert, update, delete on public.bank_statement_lines to authenticated, service_role;
revoke all on public.bank_statements from public, anon;
revoke all on public.bank_statement_lines from public, anon;

-- Confirming a match is an explicit act. The function does not search by amount.
create or replace function public.confirm_statement_match(
  p_line_id uuid,
  p_payment_id uuid,
  p_expense_id uuid,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_account uuid;
begin
  if not public.is_finance_reader() then
    raise exception 'Not authorised to reconcile a statement';
  end if;
  if p_payment_id is not null and p_expense_id is not null then
    raise exception 'A statement line matches a payment or an expense, not both.';
  end if;

  select s.account_id into v_account
    from public.bank_statement_lines l
    join public.bank_statements s on s.id = l.statement_id
   where l.id = p_line_id;
  if v_account is null then
    raise exception 'Statement line not found';
  end if;

  if p_payment_id is not null and not exists (
    select 1 from public.invoice_payments
    where id = p_payment_id
      and payment_account_id = v_account
  ) then
    raise exception 'That payment is not on this bank account.';
  end if;

  if p_expense_id is not null and not exists (
    select 1 from public.expenses
    where id = p_expense_id
      and payment_account_id = v_account
  ) then
    raise exception 'That expense is not on this bank account.';
  end if;

  update public.bank_statement_lines
     set matched_payment_id = p_payment_id,
         matched_expense_id = p_expense_id,
         match_note = nullif(btrim(coalesce(p_note, '')), '')
   where id = p_line_id;
end;
$$;

revoke all on function public.confirm_statement_match(uuid, uuid, uuid, text) from public, anon;
grant execute on function public.confirm_statement_match(uuid, uuid, uuid, text)
  to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Private bucket. A bank statement is not public.
-- Accountant is not granted storage. They read lines through the view below.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
values ('bank-statements', 'bank-statements', false, 20971520)
on conflict (id) do update
  set public = false,
      file_size_limit = 20971520;

drop policy if exists "bank statements admin select" on storage.objects;
create policy "bank statements admin select" on storage.objects
  for select to authenticated
  using (bucket_id = 'bank-statements' and public.is_admin());

drop policy if exists "bank statements admin insert" on storage.objects;
create policy "bank statements admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'bank-statements' and public.is_admin());

drop policy if exists "bank statements admin update" on storage.objects;
create policy "bank statements admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'bank-statements' and public.is_admin());

drop policy if exists "bank statements admin delete" on storage.objects;
create policy "bank statements admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'bank-statements' and public.is_admin());

insert into public.document_categories (key, label, entity_types, sort_order, is_active)
values ('bank_statement', 'Bank statement', array['kennel'], 20, true)
on conflict (key) do nothing;

drop policy if exists "Bank statement documents stay with admins" on public.documents;
create policy "Bank statement documents stay with admins"
  on public.documents
  as restrictive
  for all
  to authenticated
  using (category is distinct from 'bank_statement' or public.is_admin())
  with check (category is distinct from 'bank_statement' or public.is_admin());

-- ---------------------------------------------------------------------------
-- Bookkeeper views. Revenue includes cash. Bank-only is not this view.
-- VIEW:accountant_payment_register
-- ---------------------------------------------------------------------------

create or replace view public.accountant_payment_register
with (security_invoker = false) as
select
  ip.id,
  ip.payment_date,
  ip.amount,
  coalesce(ip.payment_method, '') as payment_method,
  ip.payment_account_id,
  coalesce(pa.name, '') as account_name,
  coalesce(pa.account_type, '') as account_type,
  ip.banked_on,
  coalesce(ip.banked_reference, '') as banked_reference,
  i.id as invoice_id,
  i.invoice_number,
  i.status as invoice_status,
  coalesce(
    nullif(trim(u.full_name), ''),
    nullif(trim(i.historical_client_name), ''),
    ''
  ) as client_name,
  (pa.account_type = 'cash' and ip.banked_on is null) as cash_on_hand
from public.invoice_payments ip
join public.invoices i on i.id = ip.invoice_id
left join public.payment_accounts pa on pa.id = ip.payment_account_id
left join public.users u on u.id = i.client_id
where public.is_finance_reader();

-- END VIEW:accountant_payment_register

comment on view public.accountant_payment_register is
  'Every receipt, cash included. Account name and type say where the money landed. Do not add a filter that drops cash sales. Bank-only is a screen filter the bookkeeper can clear.';

-- VIEW:accountant_cash_on_hand
create or replace view public.accountant_cash_on_hand
with (security_invoker = false) as
select
  ip.id,
  ip.payment_date,
  ip.amount,
  coalesce(ip.payment_method, '') as payment_method,
  pa.name as account_name,
  i.invoice_number,
  coalesce(
    nullif(trim(u.full_name), ''),
    nullif(trim(i.historical_client_name), ''),
    ''
  ) as client_name
from public.invoice_payments ip
join public.payment_accounts pa on pa.id = ip.payment_account_id
join public.invoices i on i.id = ip.invoice_id
left join public.users u on u.id = i.client_id
where public.is_finance_reader()
  and pa.account_type = 'cash'
  and ip.banked_on is null;

-- END VIEW:accountant_cash_on_hand

comment on view public.accountant_cash_on_hand is
  'Cash received that has not been deposited. A balance to count, not a hidden slice of revenue.';

-- VIEW:accountant_bank_statements
-- Statements only. Not a revenue view. Scoped to bank accounts.
create or replace view public.accountant_bank_statements
with (security_invoker = false) as
select
  bs.id,
  bs.account_id,
  pa.name as account_name,
  pa.account_type,
  bs.period_start,
  bs.period_end,
  bs.opening_balance,
  bs.closing_balance,
  bs.source_kind,
  (bs.document_id is not null) as document_attached,
  bs.uploaded_at
from public.bank_statements bs
join public.payment_accounts pa on pa.id = bs.account_id
where public.is_finance_reader()
  and pa.account_type = 'bank';

-- END VIEW:accountant_bank_statements

comment on view public.accountant_bank_statements is
  'Bank statements for bank accounts. No storage path. Cash is not a bank statement.';

-- VIEW:accountant_bank_statement_lines
create or replace view public.accountant_bank_statement_lines
with (security_invoker = false) as
select
  l.id,
  l.statement_id,
  s.account_id,
  l.transaction_date,
  coalesce(l.description, '') as description,
  coalesce(l.reference, '') as reference,
  l.amount,
  l.matched_payment_id,
  l.matched_expense_id,
  coalesce(l.match_note, '') as match_note
from public.bank_statement_lines l
join public.bank_statements s on s.id = l.statement_id
join public.payment_accounts pa on pa.id = s.account_id
where public.is_finance_reader()
  and pa.account_type = 'bank';

-- END VIEW:accountant_bank_statement_lines

-- Purchase register gains the account that paid, so a bank reconciliation
-- can see expenses without opening the expense row. Existing columns stay
-- in place. Cash expenses are still in this register.
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
  e.description,
  e.payment_account_id,
  coalesce(pa.name, '') as account_name,
  coalesce(pa.account_type, '') as account_type
from public.expenses e
left join public.expense_categories c on c.id = e.category_id
left join public.payment_accounts pa on pa.id = e.payment_account_id
where public.is_finance_reader();

revoke all on public.accountant_payment_register from public, anon;
revoke all on public.accountant_cash_on_hand from public, anon;
revoke all on public.accountant_bank_statements from public, anon;
revoke all on public.accountant_bank_statement_lines from public, anon;

grant select on public.accountant_payment_register to authenticated, service_role;
grant select on public.accountant_cash_on_hand to authenticated, service_role;
grant select on public.accountant_bank_statements to authenticated, service_role;
grant select on public.accountant_bank_statement_lines to authenticated, service_role;

notify pgrst, 'reload schema';
