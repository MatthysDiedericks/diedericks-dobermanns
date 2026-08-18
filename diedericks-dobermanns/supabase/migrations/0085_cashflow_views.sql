-- Cashflow reporting views. No stored totals — always derived from the ledger.
-- security_invoker: RLS on invoices / expenses / payments still applies.

-- Pairing label + go-home for dating expected balances.
create or replace view public.v_litter_go_home as
select
  l.id as litter_id,
  l.go_home_date,
  trim(both from
    coalesce(dam.name, 'Dam') || ' × ' || coalesce(sire.name, 'Sire')
  ) as pairing
from public.litters l
left join public.dogs dam on dam.id = l.mother_id
left join public.dogs sire on sire.id = l.father_id;

alter view public.v_litter_go_home set (security_invoker = true);

-- Actual cash in: invoice_payments, plus live `payments` not already recorded
-- there, plus historical_income that was never converted to an invoice.
create or replace view public.v_cash_receipts as
select
  ip.id,
  'invoice_payment'::text as source,
  ip.payment_date::date as received_on,
  ip.amount::numeric as amount,
  ip.payment_method as method,
  ip.invoice_id,
  i.invoice_number,
  i.client_id,
  coalesce(u.full_name, i.historical_client_name) as buyer_name,
  i.dog_id,
  i.litter_id
from public.invoice_payments ip
join public.invoices i on i.id = ip.invoice_id
left join public.users u on u.id = i.client_id
where i.status not in ('void', 'cancelled', 'draft')

union all

select
  p.id,
  'payment'::text,
  p.paid_at::date,
  p.amount::numeric,
  p.method,
  p.invoice_id,
  i.invoice_number,
  i.client_id,
  coalesce(u.full_name, i.historical_client_name),
  i.dog_id,
  i.litter_id
from public.payments p
join public.invoices i on i.id = p.invoice_id
left join public.users u on u.id = i.client_id
where i.status not in ('void', 'cancelled', 'draft')
  and not exists (
    select 1 from public.invoice_payments ip
    where ip.invoice_id = p.invoice_id
      and ip.amount = p.amount
      and ip.payment_date::date = p.paid_at::date
  )

union all

select
  h.id,
  'historical'::text,
  h.income_date::date,
  h.total_amount::numeric,
  coalesce(h.source, h.category),
  null::uuid,
  h.invoice_number,
  null::uuid,
  h.contact_name,
  h.dog_id,
  null::uuid
from public.historical_income h
where not exists (
  select 1 from public.invoices i where i.historical_income_id = h.id
);

alter view public.v_cash_receipts set (security_invoker = true);

-- Outstanding balances, dated by go-home then due_date then waiting-on litter.
create or replace view public.v_cash_expected_in as
select distinct on (i.id)
  i.id as invoice_id,
  i.invoice_number,
  i.client_id,
  coalesce(u.full_name, i.historical_client_name, 'Unknown') as buyer_name,
  i.amount_outstanding::numeric as amount,
  i.due_date,
  i.dog_id,
  i.litter_id,
  i.quote_id,
  d.name as dog_name,
  coalesce(ld.go_home_date, li.go_home_date, i.due_date, lw.go_home_date) as expected_date,
  case
    when ld.go_home_date is not null then 'go_home_dog_litter'
    when li.go_home_date is not null then 'go_home_invoice_litter'
    when i.due_date is not null then 'due_date'
    when lw.go_home_date is not null then 'go_home_waiting_litter'
    else 'unknown'
  end as date_basis,
  case
    when ld.go_home_date is not null then
      'dated from the ' || ld.pairing || ' go-home date'
    when li.go_home_date is not null then
      'dated from the ' || li.pairing || ' go-home date'
    when i.due_date is not null then
      'dated from the invoice due date'
    when lw.go_home_date is not null then
      'dated from the ' || lw.pairing || ' go-home date'
    else 'no expected date on file'
  end as basis_label,
  coalesce(ld.pairing, li.pairing, lw.pairing) as litter_label
from public.invoices i
left join public.users u on u.id = i.client_id
left join public.dogs d on d.id = i.dog_id
left join public.v_litter_go_home ld on ld.litter_id = d.litter_id
left join public.v_litter_go_home li on li.litter_id = i.litter_id
left join lateral (
  select wl.assigned_litter_id
  from public.waiting_list wl
  where wl.deposit_invoice_id = i.id
     or wl.balance_invoice_id = i.id
     or (i.quote_id is not null and wl.quote_id = i.quote_id)
  order by wl.updated_at desc nulls last
  limit 1
) wl on true
left join lateral (
  select qi.litter_id
  from public.quote_items qi
  where i.quote_id is not null
    and qi.quote_id = i.quote_id
    and qi.litter_id is not null
  limit 1
) qlit on true
left join public.v_litter_go_home lw
  on lw.litter_id = coalesce(wl.assigned_litter_id, qlit.litter_id)
where coalesce(i.amount_outstanding, 0) > 0
  and i.status not in ('void', 'cancelled', 'draft')
order by i.id;

alter view public.v_cash_expected_in set (security_invoker = true);

-- Deposits received against dogs not yet handed over.
-- Invoice part-payments plus waiting-list deposits where a puppy/litter is attached.
-- Does not feed income totals — a stat, not an accounting adjustment.
create or replace view public.v_deposits_held as
select
  i.id as invoice_id,
  i.invoice_number,
  coalesce(u.full_name, i.historical_client_name, wl.enquirer_name) as buyer_name,
  i.amount_paid::numeric as amount_paid,
  i.amount_outstanding::numeric as amount_outstanding,
  d.name as dog_name,
  d.handover_status,
  d.handover_date
from public.invoices i
left join public.users u on u.id = i.client_id
left join public.waiting_list wl on wl.deposit_invoice_id = i.id
left join public.dogs d on d.id = coalesce(i.dog_id, wl.assigned_dog_id)
where i.status not in ('void', 'cancelled', 'draft')
  and coalesce(i.amount_paid, 0) > 0
  and coalesce(i.amount_outstanding, 0) > 0
  and (
    d.id is null
    or (
      coalesce(d.handover_status, '') is distinct from 'delivered'
      and d.handover_date is null
    )
  )

union all

select
  wl.id,
  coalesce(i.invoice_number, 'Waiting-list deposit'),
  coalesce(u.full_name, wl.enquirer_name),
  wl.deposit_amount::numeric,
  0::numeric,
  d.name,
  d.handover_status,
  d.handover_date
from public.waiting_list wl
left join public.invoices i on i.id = wl.deposit_invoice_id
left join public.users u on u.id = wl.client_id
left join public.dogs d on d.id = wl.assigned_dog_id
where wl.deposit_paid_date is not null
  and coalesce(wl.deposit_amount, 0) > 0
  and wl.status not in ('cancelled', 'withdrawn', 'sold', 'completed')
  and (wl.assigned_dog_id is not null or wl.assigned_litter_id is not null)
  and wl.deposit_invoice_id is null
  and (
    d.id is null
    or (
      coalesce(d.handover_status, '') is distinct from 'delivered'
      and d.handover_date is null
    )
  );

alter view public.v_deposits_held set (security_invoker = true);

grant select on public.v_litter_go_home to authenticated, service_role;
grant select on public.v_cash_receipts to authenticated, service_role;
grant select on public.v_cash_expected_in to authenticated, service_role;
grant select on public.v_deposits_held to authenticated, service_role;

comment on view public.v_cash_receipts is
  'Actual cash in. Never mix with forecast.';
comment on view public.v_cash_expected_in is
  'Outstanding invoices dated by go-home, then due date, then waiting-on litter.';
comment on view public.v_deposits_held is
  'Cash in the bank that already has a puppy attached. Not an income adjustment.';
