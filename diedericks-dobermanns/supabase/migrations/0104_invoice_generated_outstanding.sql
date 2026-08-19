-- amount_outstanding is generated as (total_amount - amount_paid). Never write it.

create or replace function public.sync_invoice_amount_paid()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_inv uuid := coalesce(new.invoice_id, old.invoice_id);
  v_paid numeric(12,2);
begin
  select coalesce(sum(amount), 0) into v_paid
    from public.invoice_payments where invoice_id = v_inv;

  update public.invoices
     set amount_paid = v_paid,
         status = case
           when v_paid >= total_amount then 'paid'
           when v_paid > 0 then 'partially_paid'
           else status
         end,
         paid_date = case when v_paid >= total_amount then current_date else null end,
         updated_at = now()
   where id = v_inv;
  return coalesce(new, old);
end;
$function$;

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
begin
  inv := coalesce(new.invoice_id, old.invoice_id);
  if inv is null then
    return null;
  end if;

  select coalesce(sum(quantity * unit_price), 0)
    into v_subtotal
    from public.invoice_items
   where invoice_id = inv;

  select coalesce(discount_amount, 0)
    into v_discount
    from public.invoices
   where id = inv;

  v_total := greatest(v_subtotal - v_discount, 0);

  update public.invoices
     set subtotal = v_subtotal,
         total_amount = v_total,
         updated_at = now()
   where id = inv;

  return null;
end;
$$;

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
  return new;
end;
$$;

grant execute on function public.is_admin() to public, anon, authenticated, service_role;
grant execute on function public.is_trainer_or_above() to public, anon, authenticated, service_role;

alter table public.documents drop constraint if exists documents_review_status_check;
alter table public.documents add constraint documents_review_status_check
  check (
    review_status is null
    or review_status = any (array['pending'::text, 'cleared'::text, 'rejected'::text, 'verified'::text])
  );
