-- One invoice per sale. Contact required on send. Go-home dating. Proof verify.

-- Converted invoice is the sale, not a draft. Both waitlist invoice FKs
-- point at this one row — a deposit is a payment against it, not a second bill.
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
    delivery_decision, delivery_note, dog_id, litter_id
  ) values (
    v_quote.client_id, v_quote.historical_client_name, v_quote.id, 'sent', v_quote.currency,
    v_quote.subtotal, v_quote.discount, v_quote.total, 0,
    v_quote.notes, current_date, v_quote.valid_until, v_quote.created_by, '',
    v_quote.delivery_decision, v_quote.delivery_note, v_dog, v_litter
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
    qi.description, qi.quantity, qi.unit_price, qi.sort_order, qi.catalogue_code
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

-- 3. Cannot mark a quote sent with nobody attached.
create or replace function public.trg_quote_sent_requires_contact()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.status in ('sent', 'accepted')
     and (old.status is distinct from new.status)
     and new.contact_id is null then
    raise exception 'A quote cannot be sent without a contact';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_quote_sent_requires_contact on public.quotes;
create trigger trg_quote_sent_requires_contact
  before update of status on public.quotes
  for each row execute function public.trg_quote_sent_requires_contact();

-- 4. Proof document on the receipts ledger.
alter table public.invoice_payments
  add column if not exists proof_document_id uuid references public.documents(id);

-- 5. Verifying a proof writes the receipt and stamps the waitlist.
create or replace function public.verify_payment_proof(
  p_document_id uuid,
  p_invoice_id uuid,
  p_amount numeric,
  p_payment_date date,
  p_method text,
  p_reference text default null
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
    recorded_by, proof_document_id
  ) values (
    p_invoice_id, p_amount, coalesce(p_payment_date, current_date),
    coalesce(nullif(btrim(p_method), ''), 'eft'), nullif(btrim(p_reference), ''),
    'Verified from proof of payment', auth.uid(), p_document_id
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

grant execute on function public.verify_payment_proof(uuid, uuid, numeric, date, text, text)
  to authenticated;

-- 6. Forecast dates: dog litter go-home, then waiting-on litter, then due date.
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
  coalesce(ld.go_home_date, lw.go_home_date, i.due_date) as expected_date,
  case
    when ld.go_home_date is not null then 'go_home_dog_litter'
    when lw.go_home_date is not null then 'go_home_waiting_litter'
    when i.due_date is not null then 'due_date'
    else 'unknown'
  end as date_basis,
  case
    when ld.go_home_date is not null then
      'dated from the ' || ld.pairing || ' go-home date'
    when lw.go_home_date is not null then
      'dated from the ' || lw.pairing || ' go-home date'
    when i.due_date is not null then
      'dated from the invoice due date'
    else 'no expected date on file'
  end as basis_label,
  coalesce(ld.pairing, lw.pairing) as litter_label
from public.invoices i
left join public.users u on u.id = i.client_id
left join public.dogs d on d.id = i.dog_id
left join public.v_litter_go_home ld on ld.litter_id = d.litter_id
left join lateral (
  select coalesce(wl.assigned_litter_id, qlit.litter_id, i.litter_id) as litter_id
  from (select 1) z
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
) wait on true
left join public.v_litter_go_home lw on lw.litter_id = wait.litter_id
where coalesce(i.amount_outstanding, 0) > 0
  and i.status not in ('void', 'cancelled', 'draft')
order by i.id;

alter view public.v_cash_expected_in set (security_invoker = true);
grant select on public.v_cash_expected_in to authenticated, service_role;

grant execute on function public.is_admin() to public, anon, authenticated, service_role;
grant execute on function public.is_trainer_or_above() to public, anon, authenticated, service_role;
