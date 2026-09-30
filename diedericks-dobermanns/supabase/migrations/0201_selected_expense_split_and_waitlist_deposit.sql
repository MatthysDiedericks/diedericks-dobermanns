-- 0201 — selected expense splits, and waiting-list deposits that follow the payment.
--
-- `selected` is an explicit set of dogs. Existing `dog` and `shared` rows stay as they are.
-- A payment recorded on an invoice is the source of truth for the waiting-list deposit.
-- verify_payment_proof used to be the only writer of deposit_amount; Record payment was not.

alter table public.expenses drop constraint if exists expenses_allocation_type_check;
alter table public.expenses add constraint expenses_allocation_type_check
  check (allocation_type in ('company', 'shared', 'dog', 'litter', 'selected'));

alter table public.expense_lines drop constraint if exists expense_lines_allocation_kind_check;
alter table public.expense_lines add constraint expense_lines_allocation_kind_check
  check (allocation_kind in ('company', 'shared', 'dog', 'litter', 'selected'));

comment on column public.expenses.allocation_type is
  'company = overhead. shared = every dog on that date. dog = one dog. litter = one litter. selected = the dogs a person picked, split across that set only.';

-- Replace the allocations of one expense in a single transaction.
-- A delete that commits before the insert would leave a dog Matt just removed.
create or replace function public.replace_selected_expense_allocations(
  p_expense_id uuid,
  p_description text,
  p_line_amount numeric,
  p_rows jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_line uuid;
  v_lines int;
  v_sum numeric;
begin
  if not public.is_admin() then
    raise exception 'Not authorised' using errcode = '42501';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) < 1 then
    raise exception 'Select at least one dog' using errcode = '22023';
  end if;

  select coalesce(sum((r->>'amount')::numeric), 0)
    into v_sum
    from jsonb_array_elements(p_rows) r;

  if round(v_sum * 100)::bigint is distinct from round(p_line_amount * 100)::bigint then
    raise exception 'Allocations must add up to the expense amount' using errcode = '22023';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(p_rows) r
     where nullif(r->>'dog_id', '') is null
  ) then
    raise exception 'Every share needs a dog' using errcode = '22023';
  end if;

  select count(*) into v_lines from public.expense_lines where expense_id = p_expense_id;
  if v_lines > 1 then
    raise exception 'This expense has more than one line' using errcode = '22023';
  end if;

  update public.expenses
     set allocation_type = 'selected',
         dog_id = null,
         litter_id = null,
         updated_at = now()
   where id = p_expense_id;
  if not found then
    raise exception 'Expense not found' using errcode = 'P0002';
  end if;

  select id into v_line
    from public.expense_lines
   where expense_id = p_expense_id
   order by sort_order, created_at
   limit 1;

  if v_line is null then
    insert into public.expense_lines (
      expense_id, description, quantity, unit_amount, line_amount, allocation_kind, sort_order
    ) values (
      p_expense_id,
      coalesce(nullif(btrim(p_description), ''), 'Expense'),
      1,
      p_line_amount,
      p_line_amount,
      'selected',
      0
    )
    returning id into v_line;
  else
    update public.expense_lines
       set allocation_kind = 'selected',
           line_amount = p_line_amount,
           unit_amount = p_line_amount,
           description = coalesce(nullif(btrim(p_description), ''), description)
     where id = v_line;
  end if;

  delete from public.expense_allocations where expense_line_id = v_line;

  insert into public.expense_allocations (
    expense_line_id, dog_id, litter_id, amount, weight, basis_note
  )
  select
    v_line,
    (r->>'dog_id')::uuid,
    nullif(r->>'litter_id', '')::uuid,
    (r->>'amount')::numeric,
    1,
    r->>'basis_note'
  from jsonb_array_elements(p_rows) r;
end;
$$;

revoke all on function public.replace_selected_expense_allocations(uuid, text, numeric, jsonb)
  from public, anon;
grant execute on function public.replace_selected_expense_allocations(uuid, text, numeric, jsonb)
  to authenticated, service_role;

-- Drop a selected split when the expense is no longer that kind.
-- Delete and the line-kind change commit together.
create or replace function public.release_selected_expense_allocations(
  p_expense_id uuid,
  p_kind text,
  p_line_amount numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_line uuid;
  v_lines int;
  v_dog uuid;
  v_litter uuid;
begin
  if not public.is_admin() then
    raise exception 'Not authorised' using errcode = '42501';
  end if;
  if p_kind not in ('company', 'shared', 'dog', 'litter') then
    raise exception 'Unknown allocation' using errcode = '22023';
  end if;

  select count(*) into v_lines from public.expense_lines where expense_id = p_expense_id;
  if v_lines > 1 then
    raise exception 'This expense has more than one line' using errcode = '22023';
  end if;

  select id into v_line
    from public.expense_lines
   where expense_id = p_expense_id
   order by sort_order, created_at
   limit 1;

  if v_line is null then
    return;
  end if;

  delete from public.expense_allocations where expense_line_id = v_line;

  update public.expense_lines
     set allocation_kind = p_kind,
         line_amount = p_line_amount
   where id = v_line;

  select dog_id, litter_id into v_dog, v_litter
    from public.expenses
   where id = p_expense_id;

  if p_kind = 'dog' and v_dog is not null then
    insert into public.expense_allocations (
      expense_line_id, dog_id, litter_id, amount, weight, basis_note
    ) values (
      v_line, v_dog, null, p_line_amount, 1, 'direct to one dog'
    );
  elsif p_kind = 'litter' and v_litter is not null then
    insert into public.expense_allocations (
      expense_line_id, dog_id, litter_id, amount, weight, basis_note
    ) values (
      v_line, null, v_litter, p_line_amount, 1, 'direct to one litter'
    );
  end if;
end;
$$;

revoke all on function public.release_selected_expense_allocations(uuid, text, numeric)
  from public, anon;
grant execute on function public.release_selected_expense_allocations(uuid, text, numeric)
  to authenticated, service_role;

-- Payment rows are the source of truth. amount_paid on the invoice is their sum,
-- but this reads the payment rows themselves so it does not depend on trigger order.
create or replace function public.sync_waitlist_deposit_from_invoice(p_invoice_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_paid numeric(12,2);
  v_total numeric(12,2);
  v_paid_on date;
  v_status text;
begin
  if p_invoice_id is null then
    return;
  end if;

  select coalesce(sum(amount), 0), min(payment_date)
    into v_paid, v_paid_on
    from public.invoice_payments
   where invoice_id = p_invoice_id;

  if v_paid <= 0 then
    return;
  end if;

  select total_amount into v_total
    from public.invoices
   where id = p_invoice_id;
  if v_total is null then
    return;
  end if;

  v_status := case
    when v_paid + 0.009 >= v_total then 'paid_in_full'
    else 'deposit_paid'
  end;

  update public.waiting_list w
     set deposit_amount = v_paid,
         deposit_paid_date = coalesce(v_paid_on, current_date),
         payment_status = v_status,
         pipeline_stage = case
           when w.pipeline_stage in ('quote_sent', 'approved', 'enquiry', 'applied')
             then 'deposit_paid'
           else w.pipeline_stage
         end,
         stage_change_note = case
           when w.pipeline_stage in ('quote_sent', 'approved', 'enquiry', 'applied')
             then 'Payment recorded'
           else w.stage_change_note
         end,
         stage_updated_at = case
           when w.pipeline_stage in ('quote_sent', 'approved', 'enquiry', 'applied')
             then now()
           else w.stage_updated_at
         end,
         updated_at = now()
   where w.deposit_invoice_id = p_invoice_id
     and w.status = 'active';
end;
$$;

revoke all on function public.sync_waitlist_deposit_from_invoice(uuid)
  from public, anon;
grant execute on function public.sync_waitlist_deposit_from_invoice(uuid)
  to authenticated, service_role;

create or replace function public.promote_waitlist_on_payment(
  p_client_id uuid,
  p_contact_id uuid,
  p_invoice_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_ids uuid[] := '{}';
  v_emails text[] := '{}';
  v_app public.applications%rowtype;
  v_quote_id uuid;
begin
  if p_client_id is not null then
    v_client_ids := array_append(v_client_ids, p_client_id);
  end if;
  if p_contact_id is not null then
    v_client_ids := v_client_ids || array(
      select c.user_id from public.contacts c
      where c.id = p_contact_id and c.user_id is not null
    );
    v_emails := v_emails || array(
      select lower(btrim(c.email)) from public.contacts c
      where c.id = p_contact_id and c.email is not null
    );
  end if;
  if p_client_id is not null then
    v_emails := v_emails || array(
      select lower(btrim(u.email)) from public.users u
      where u.id = p_client_id and u.email is not null
    );
    v_emails := v_emails || array(
      select lower(btrim(c.email)) from public.contacts c
      where c.user_id = p_client_id and c.email is not null
    );
  end if;

  v_client_ids := (select coalesce(array_agg(distinct x), '{}') from unnest(v_client_ids) x where x is not null);
  v_emails := (select coalesce(array_agg(distinct x), '{}') from unnest(v_emails) x where x is not null and x <> '');

  if p_invoice_id is not null then
    select i.quote_id into v_quote_id from public.invoices i where i.id = p_invoice_id;
  end if;

  for v_app in
    select a.*
      from public.applications a
     where a.status in ('approved', 'waitlisted')
       and a.archived_at is null
       and (
         (cardinality(v_client_ids) > 0 and a.user_id = any (v_client_ids))
         or (cardinality(v_emails) > 0 and lower(btrim(a.email)) = any (v_emails))
         or (v_quote_id is not null and exists (
              select 1 from public.quotes q
              where q.id = v_quote_id and q.application_id = a.id
            ))
       )
  loop
    perform public.ensure_waitlist_lines_for_application(v_app.id, p_invoice_id);
    update public.applications
       set status = 'waitlisted'
     where id = v_app.id
       and status = 'approved';
  end loop;

  if p_invoice_id is not null then
    perform public.sync_waitlist_deposit_from_invoice(p_invoice_id);
  end if;
end;
$$;

-- Bring any row that still disagrees with its invoice back into line.
-- Safe to re-run: the function writes the payment-row total, not a guessed figure.
do $$
declare
  r record;
begin
  for r in
    select distinct w.deposit_invoice_id as id
      from public.waiting_list w
      join public.invoices i on i.id = w.deposit_invoice_id
     where w.status = 'active'
       and i.amount_paid > 0
  loop
    perform public.sync_waitlist_deposit_from_invoice(r.id);
  end loop;
end;
$$;

-- Daily health check. Must return 0 rows.
create or replace view public.health_waitlist_deposit_drift
with (security_invoker = true) as
select
  w.enquirer_name,
  w.pipeline_stage,
  w.deposit_amount,
  i.invoice_number,
  i.amount_paid
from public.waiting_list w
join public.invoices i on i.id = w.deposit_invoice_id
where w.status = 'active'
  and i.amount_paid > 0
  and (
    w.deposit_amount is distinct from i.amount_paid
    or w.pipeline_stage in ('quote_sent', 'approved', 'enquiry', 'applied')
  );

comment on view public.health_waitlist_deposit_drift is
  'Daily health check. Must return 0 rows. A waiting-list deposit that does not match the invoice payment rows.';

revoke all on public.health_waitlist_deposit_drift from anon, public;
grant select on public.health_waitlist_deposit_drift to authenticated, service_role;

notify pgrst, 'reload schema';
