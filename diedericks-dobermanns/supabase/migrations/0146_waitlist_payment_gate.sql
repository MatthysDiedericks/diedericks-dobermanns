-- Waiting list requires a recorded payment. Approval alone is not commitment.
-- Existing waitlist rows are left untouched. New inserts hit this gate.

-- ---------------------------------------------------------------------------
-- 1. Has this client / contact actually paid?
-- ---------------------------------------------------------------------------
create or replace function public.client_has_payment(
  p_client_id uuid,
  p_contact_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_client_ids uuid[] := '{}';
  v_contact_ids uuid[] := '{}';
begin
  if p_client_id is not null then
    v_client_ids := array_append(v_client_ids, p_client_id);
    v_contact_ids := v_contact_ids || array(
      select c.id from public.contacts c
      where c.user_id = p_client_id and c.merged_into_contact_id is null
    );
  end if;

  if p_contact_id is not null then
    v_contact_ids := array_append(v_contact_ids, p_contact_id);
    v_client_ids := v_client_ids || array(
      select c.user_id from public.contacts c
      where c.id = p_contact_id and c.user_id is not null
    );
  end if;

  v_client_ids := (select coalesce(array_agg(distinct x), '{}') from unnest(v_client_ids) x where x is not null);
  v_contact_ids := (select coalesce(array_agg(distinct x), '{}') from unnest(v_contact_ids) x where x is not null);

  if cardinality(v_client_ids) = 0 and cardinality(v_contact_ids) = 0 then
    return false;
  end if;

  if exists (
    select 1
      from public.invoices i
     where i.amount_paid > 0
       and i.status not in ('void', 'cancelled', 'draft')
       and (
         (cardinality(v_client_ids) > 0 and i.client_id = any (v_client_ids))
         or (
           cardinality(v_contact_ids) > 0
           and i.quote_id in (
             select q.id from public.quotes q where q.contact_id = any (v_contact_ids)
           )
         )
         or (
           cardinality(v_client_ids) > 0
           and i.quote_id in (
             select q.id from public.quotes q where q.client_id = any (v_client_ids)
           )
         )
       )
  ) then
    return true;
  end if;

  if exists (
    select 1
      from public.invoice_payments ip
      join public.invoices i on i.id = ip.invoice_id
     where ip.amount > 0
       and i.status not in ('void', 'cancelled', 'draft')
       and (
         (cardinality(v_client_ids) > 0 and i.client_id = any (v_client_ids))
         or (
           cardinality(v_contact_ids) > 0
           and i.quote_id in (
             select q.id from public.quotes q where q.contact_id = any (v_contact_ids)
           )
         )
         or (
           cardinality(v_client_ids) > 0
           and i.quote_id in (
             select q.id from public.quotes q where q.client_id = any (v_client_ids)
           )
         )
       )
  ) then
    return true;
  end if;

  if to_regclass('public.payments') is not null and exists (
    select 1
      from public.payments p
      join public.invoices i on i.id = p.invoice_id
     where p.amount > 0
       and i.status not in ('void', 'cancelled', 'draft')
       and (
         (cardinality(v_client_ids) > 0 and (p.client_id = any (v_client_ids) or i.client_id = any (v_client_ids)))
         or (
           cardinality(v_contact_ids) > 0
           and i.quote_id in (
             select q.id from public.quotes q where q.contact_id = any (v_contact_ids)
           )
         )
       )
  ) then
    return true;
  end if;

  if to_regclass('public.payment_orders') is not null
     and cardinality(v_client_ids) > 0
     and exists (
       select 1 from public.payment_orders po
        where po.status = 'paid'
          and po.amount > 0
          and po.client_id = any (v_client_ids)
     )
  then
    return true;
  end if;

  return false;
end;
$$;

comment on function public.client_has_payment(uuid, uuid) is
  'True when a payments/invoice_payments row or an invoice with amount_paid > 0 is linked to this client or contact (including the contact.user_id pairing).';

grant execute on function public.client_has_payment(uuid, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Resolve parties on a waiting_list row, then ask client_has_payment.
-- ---------------------------------------------------------------------------
create or replace function public.waiting_list_row_has_payment(p_row public.waiting_list)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_client uuid := p_row.client_id;
  v_contact uuid;
  v_email text := nullif(lower(btrim(coalesce(p_row.enquirer_email, ''))), '');
  v_q_client uuid;
  v_q_contact uuid;
  v_app_user uuid;
  v_app_email text;
  v_c_id uuid;
  v_c_user uuid;
begin
  if p_row.quote_id is not null then
    select q.client_id, q.contact_id
      into v_q_client, v_q_contact
      from public.quotes q
     where q.id = p_row.quote_id;
    v_client := coalesce(v_client, v_q_client);
    v_contact := coalesce(v_contact, v_q_contact);
  end if;

  if p_row.application_id is not null then
    select a.user_id, nullif(lower(btrim(coalesce(a.email, ''))), '')
      into v_app_user, v_app_email
      from public.applications a
     where a.id = p_row.application_id;
    v_client := coalesce(v_client, v_app_user);
    v_email := coalesce(v_email, v_app_email);

    if v_contact is null then
      select q.contact_id, q.client_id
        into v_q_contact, v_q_client
        from public.quotes q
       where q.application_id = p_row.application_id
       order by q.created_at desc
       limit 1;
      v_contact := coalesce(v_contact, v_q_contact);
      v_client := coalesce(v_client, v_q_client);
    end if;
  end if;

  if v_contact is null and v_email is not null then
    select c.id, c.user_id
      into v_c_id, v_c_user
      from public.contacts c
     where c.merged_into_contact_id is null
       and c.email is not null
       and lower(btrim(c.email)) = v_email
     order by c.created_at desc nulls last
     limit 1;
    v_contact := v_c_id;
    v_client := coalesce(v_client, v_c_user);
  end if;

  return public.client_has_payment(v_client, v_contact);
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. BEFORE INSERT gate. Override via transaction-local GUC + audit_log.
-- ---------------------------------------------------------------------------
create or replace function public.trg_waiting_list_require_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text;
begin
  v_reason := nullif(btrim(current_setting('app.waitlist_payment_override', true)), '');

  if public.waiting_list_row_has_payment(new) then
    return new;
  end if;

  if v_reason is not null then
    insert into public.audit_log (
      table_name, record_id, action, actor_id, actor_role, new_values
    ) values (
      'waiting_list',
      new.id::text,
      'insert',
      auth.uid(),
      'admin',
      jsonb_build_object(
        'event', 'waitlist_payment_override',
        'reason', v_reason,
        'client_id', new.client_id,
        'application_id', new.application_id,
        'quote_id', new.quote_id,
        'enquirer_name', new.enquirer_name,
        'enquirer_email', new.enquirer_email
      )
    );
    return new;
  end if;

  raise exception
    'WAITLIST_PAYMENT_REQUIRED: A recorded payment is required before adding someone to the waiting list. Approval is not enough. To override (cash deposit, arrangement made), set_config(''app.waitlist_payment_override'', ''reason'', true) in this transaction, or call waiting_list_insert_with_override.'
    using errcode = 'P0001';
end;
$$;

drop trigger if exists trg_waiting_list_require_payment on public.waiting_list;
create trigger trg_waiting_list_require_payment
  before insert on public.waiting_list
  for each row
  execute function public.trg_waiting_list_require_payment();

-- ---------------------------------------------------------------------------
-- 4. Admin override insert (same transaction as the GUC + row).
-- ---------------------------------------------------------------------------
create or replace function public.waiting_list_insert_with_override(
  p_row jsonb,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_reason text := nullif(btrim(coalesce(p_reason, '')), '');
begin
  if not public.is_admin() then
    raise exception 'Not authorised' using errcode = '42501';
  end if;
  if v_reason is null or char_length(v_reason) < 3 then
    raise exception 'An override reason is required (cash deposit, arrangement made, …).';
  end if;

  perform set_config('app.waitlist_payment_override', v_reason, true);

  insert into public.waiting_list (
    list_type_id, pipeline_stage, stage_updated_at, stage_updated_by,
    client_id, application_id, litter_id,
    enquirer_name, enquirer_email, enquirer_phone, enquirer_country,
    source, preferred_category, preferred_sex, preferred_colour, tail_preference,
    budget_range, preferred_timeline, preference_notes, follow_up_date,
    priority, status, quote_id, stage_change_note
  ) values (
    (p_row->>'list_type_id')::uuid,
    coalesce(nullif(p_row->>'pipeline_stage', ''), 'enquiry'),
    coalesce((p_row->>'stage_updated_at')::timestamptz, now()),
    coalesce((p_row->>'stage_updated_by')::uuid, auth.uid()),
    (p_row->>'client_id')::uuid,
    (p_row->>'application_id')::uuid,
    (p_row->>'litter_id')::uuid,
    nullif(p_row->>'enquirer_name', ''),
    nullif(p_row->>'enquirer_email', ''),
    nullif(p_row->>'enquirer_phone', ''),
    nullif(p_row->>'enquirer_country', ''),
    coalesce(nullif(p_row->>'source', ''), 'other'),
    coalesce(nullif(p_row->>'preferred_category', ''), 'any'),
    coalesce(nullif(p_row->>'preferred_sex', ''), 'any'),
    nullif(p_row->>'preferred_colour', ''),
    nullif(p_row->>'tail_preference', ''),
    nullif(p_row->>'budget_range', ''),
    nullif(p_row->>'preferred_timeline', ''),
    nullif(p_row->>'preference_notes', ''),
    nullif(p_row->>'follow_up_date', '')::date,
    coalesce(nullif(p_row->>'priority', ''), 'normal'),
    coalesce(nullif(p_row->>'status', ''), 'active'),
    (p_row->>'quote_id')::uuid,
    coalesce(nullif(p_row->>'stage_change_note', ''), 'Payment-gate override: ' || v_reason)
  )
  returning id into v_id;

  return v_id;
end;
$$;

grant execute on function public.waiting_list_insert_with_override(jsonb, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Auto-create the waitlist row at payment time (the old approval-time path).
-- ---------------------------------------------------------------------------
create or replace function public.category_from_dog_interest(p_interest text)
returns text
language sql
immutable
as $$
  select case p_interest
    when 'elite_developed' then 'elite'
    when 'protection_dog' then 'protection'
    when 'puppy' then 'standard'
    else 'any'
  end;
$$;

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
  v_list_type uuid;
  v_app public.applications%rowtype;
  v_quote_id uuid;
  v_colour text;
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

  select id into v_list_type
    from public.waiting_list_types
   order by sort_order
   limit 1;

  for v_app in
    select a.*
      from public.applications a
     where a.status = 'approved'
       and a.archived_at is null
       and (
         (cardinality(v_client_ids) > 0 and a.user_id = any (v_client_ids))
         or (cardinality(v_emails) > 0 and lower(btrim(a.email)) = any (v_emails))
         or (v_quote_id is not null and exists (
              select 1 from public.quotes q
              where q.id = v_quote_id and q.application_id = a.id
            ))
       )
       and not exists (
         select 1 from public.waiting_list wl where wl.application_id = a.id
       )
  loop
    v_colour := case
      when v_app.preferred_colour in ('black_tan', 'brown_tan', 'no_preference') then v_app.preferred_colour
      else 'no_preference'
    end;

    insert into public.waiting_list (
      list_type_id, pipeline_stage, stage_updated_at, stage_updated_by,
      client_id, application_id, quote_id,
      enquirer_name, enquirer_email, enquirer_phone, enquirer_country,
      source, preferred_category, preferred_sex, preferred_colour, tail_preference,
      budget_range, preferred_timeline, preference_notes,
      priority, status, payment_status,
      deposit_invoice_id, deposit_paid_date,
      stage_change_note
    ) values (
      v_list_type,
      'deposit_paid',
      now(),
      auth.uid(),
      v_app.user_id,
      v_app.id,
      v_quote_id,
      v_app.full_name,
      v_app.email,
      v_app.phone,
      v_app.country,
      'app',
      public.category_from_dog_interest(v_app.dog_interest),
      coalesce(v_app.preferred_sex, 'any'),
      v_colour,
      coalesce(v_app.tail_preference, 'no_preference'),
      v_app.budget_range,
      v_app.preferred_timeline,
      coalesce(v_app.special_requests, v_app.why_dobermann),
      'normal',
      'active',
      'deposit_paid',
      p_invoice_id,
      current_date,
      'Payment recorded'
    );

    update public.applications
       set status = 'waitlisted'
     where id = v_app.id
       and status = 'approved';
  end loop;
end;
$$;

create or replace function public.trg_promote_waitlist_invoice_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client uuid;
  v_contact uuid;
begin
  select i.client_id, q.contact_id
    into v_client, v_contact
    from public.invoices i
    left join public.quotes q on q.id = i.quote_id
   where i.id = new.invoice_id;

  perform public.promote_waitlist_on_payment(v_client, v_contact, new.invoice_id);
  return new;
end;
$$;

drop trigger if exists trg_promote_waitlist_invoice_payment on public.invoice_payments;
create trigger trg_promote_waitlist_invoice_payment
  after insert on public.invoice_payments
  for each row
  when (new.amount > 0)
  execute function public.trg_promote_waitlist_invoice_payment();

create or replace function public.trg_promote_waitlist_invoice_amount()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_contact uuid;
begin
  if coalesce(old.amount_paid, 0) > 0 then
    return new;
  end if;
  select q.contact_id into v_contact
    from public.quotes q
   where q.id = new.quote_id;
  perform public.promote_waitlist_on_payment(new.client_id, v_contact, new.id);
  return new;
end;
$$;

drop trigger if exists trg_promote_waitlist_invoice_amount on public.invoices;
create trigger trg_promote_waitlist_invoice_amount
  after update of amount_paid on public.invoices
  for each row
  when (new.amount_paid > 0 and coalesce(old.amount_paid, 0) = 0)
  execute function public.trg_promote_waitlist_invoice_amount();

do $$
begin
  if to_regclass('public.payments') is not null then
    execute $fn$
      create or replace function public.trg_promote_waitlist_payments()
      returns trigger
      language plpgsql
      security definer
      set search_path = public
      as $body$
      declare
        v_client uuid;
        v_contact uuid;
      begin
        select coalesce(new.client_id, i.client_id), q.contact_id
          into v_client, v_contact
          from public.invoices i
          left join public.quotes q on q.id = i.quote_id
         where i.id = new.invoice_id;
        perform public.promote_waitlist_on_payment(v_client, v_contact, new.invoice_id);
        return new;
      end;
      $body$;
    $fn$;
    execute 'drop trigger if exists trg_promote_waitlist_payments on public.payments';
    execute 'create trigger trg_promote_waitlist_payments after insert on public.payments for each row when (new.amount > 0) execute function public.trg_promote_waitlist_payments()';
  end if;

  if to_regclass('public.payment_orders') is not null then
    execute $fn$
      create or replace function public.trg_promote_waitlist_payment_orders()
      returns trigger
      language plpgsql
      security definer
      set search_path = public
      as $body$
      begin
        perform public.promote_waitlist_on_payment(new.client_id, null, null);
        return new;
      end;
      $body$;
    $fn$;
    execute 'drop trigger if exists trg_promote_waitlist_payment_orders on public.payment_orders';
    execute 'create trigger trg_promote_waitlist_payment_orders after update of status on public.payment_orders for each row when (new.status = ''paid'' and old.status is distinct from ''paid'' and new.amount > 0) execute function public.trg_promote_waitlist_payment_orders()';
  end if;
end;
$$;
