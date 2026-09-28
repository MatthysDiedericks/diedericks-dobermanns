-- 0193 — Carry dog_id onto an invoice only when the quote names one dog.
--
-- convert_quote_to_invoice used to copy the first quote line that had a dog_id.
-- Two puppies on one quote then looked like a sale of whichever line was first.
-- One dog is copied. More than one is left blank for a person to link.
-- Litter id is unchanged: still the first litter line.

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
  v_dog_count int;
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

  select count(distinct qi.dog_id) into v_dog_count
    from quote_items qi
   where qi.quote_id = v_quote.id
     and qi.dog_id is not null;

  if v_dog_count = 1 then
    select qi.dog_id into v_dog
      from quote_items qi
     where qi.quote_id = v_quote.id
       and qi.dog_id is not null
     limit 1;
  else
    v_dog := null;
  end if;

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

notify pgrst, 'reload schema';
