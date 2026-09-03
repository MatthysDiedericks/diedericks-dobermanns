-- 0144 — Quote/invoice types and recurring invoices.
-- Existing rows keep the default 'dog_sale'. Do not reclassify history.
-- Recurring generator creates DRAFT invoices only. It never emails a client.

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
alter table public.quotes
  add column if not exists quote_type text not null default 'dog_sale';

alter table public.quotes drop constraint if exists quotes_quote_type_check;
alter table public.quotes
  add constraint quotes_quote_type_check
  check (quote_type in ('dog_sale', 'training', 'board_train', 'stud_fee', 'other'));

alter table public.invoices
  add column if not exists invoice_type text not null default 'dog_sale';

alter table public.invoices drop constraint if exists invoices_invoice_type_check;
alter table public.invoices
  add constraint invoices_invoice_type_check
  check (invoice_type in ('dog_sale', 'training', 'board_train', 'stud_fee', 'other'));

create index if not exists quotes_type_idx
  on public.quotes (quote_type, created_at desc);
create index if not exists invoices_type_idx
  on public.invoices (invoice_type, issue_date desc);

comment on column public.quotes.quote_type is
  'Headline category. Mixed puppy + training stays dog_sale.';
comment on column public.invoices.invoice_type is
  'Copied from quote_type on convert. Recurring drafts inherit the schedule type.';

-- ---------------------------------------------------------------------------
-- Recurring invoices
-- ---------------------------------------------------------------------------
create table if not exists public.recurring_invoices (
  id uuid primary key default gen_random_uuid(),

  client_id  uuid references auth.users(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  dog_id     uuid references public.dogs(id) on delete set null,

  invoice_type text not null default 'training'
    check (invoice_type in ('dog_sale', 'training', 'board_train', 'stud_fee', 'other')),

  description text not null,
  amount numeric not null check (amount >= 0),
  currency text not null default 'ZAR',

  recurrence_interval text not null
    check (recurrence_interval in ('monthly', 'quarterly', 'annual')),
  next_issue_date date not null,
  recurrence_end_date date,
  occurrences_remaining integer,

  is_active boolean not null default true,
  last_generated_invoice_id uuid references public.invoices(id) on delete set null,
  last_generated_at timestamptz,

  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint recurring_invoice_has_a_recipient
    check (client_id is not null or contact_id is not null)
);

create index if not exists recurring_invoices_due_idx
  on public.recurring_invoices (is_active, next_issue_date)
  where is_active;

drop trigger if exists recurring_invoices_set_updated_at on public.recurring_invoices;
create trigger recurring_invoices_set_updated_at
  before update on public.recurring_invoices
  for each row execute function public.set_updated_at();

alter table public.invoices
  add column if not exists recurring_invoice_id uuid
    references public.recurring_invoices(id) on delete set null;

create index if not exists invoices_recurring_id_idx
  on public.invoices (recurring_invoice_id)
  where recurring_invoice_id is not null;

comment on table public.recurring_invoices is
  'Schedules that mint draft invoices. Never emails the client.';

alter table public.recurring_invoices enable row level security;

drop policy if exists "Admin full access to recurring_invoices" on public.recurring_invoices;
create policy "Admin full access to recurring_invoices"
  on public.recurring_invoices
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Convert: invoice_type inherits quote_type
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Generator: one draft per due schedule per day. Never emails a client.
-- ---------------------------------------------------------------------------
create or replace function public.generate_due_recurring_invoices()
returns table(schedule_id uuid, invoice_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.recurring_invoices%rowtype;
  v_invoice uuid;
  v_name text;
  v_item_type text;
  v_next date;
  v_remaining integer;
  v_active boolean;
begin
  if auth.role() is distinct from 'service_role'
     and current_user not in ('postgres', 'supabase_admin')
     and not public.is_admin() then
    raise exception 'Not authorised to generate recurring invoices';
  end if;

  for s in
    select ri.*
      from public.recurring_invoices ri
     where ri.is_active
       and ri.next_issue_date <= current_date
       and (ri.last_generated_at is null or ri.last_generated_at::date < current_date)
       and (ri.recurrence_end_date is null or ri.recurrence_end_date >= ri.next_issue_date)
       and (ri.occurrences_remaining is null or ri.occurrences_remaining > 0)
     for update skip locked
  loop
    select c.full_name into v_name
      from public.contacts c
     where c.id = s.contact_id;

    v_item_type := case s.invoice_type
      when 'dog_sale' then 'dog_sale'
      when 'training' then 'training_fee'
      when 'board_train' then 'training_fee'
      else 'other'
    end;

    insert into public.invoices (
      client_id, historical_client_name, dog_id, status, currency,
      subtotal, discount_amount, total_amount, amount_paid,
      notes, issue_date, due_date, created_by, invoice_number,
      invoice_type, recurring_invoice_id
    ) values (
      s.client_id,
      case when s.client_id is null then v_name else null end,
      s.dog_id,
      'draft',
      s.currency,
      s.amount, 0, s.amount, 0,
      s.notes,
      s.next_issue_date,
      s.next_issue_date + 14,
      s.created_by,
      '',
      s.invoice_type,
      s.id
    ) returning id into v_invoice;

    insert into public.invoice_items (
      invoice_id, item_type, description, quantity, unit_price, sort_order
    ) values (
      v_invoice, v_item_type, s.description, 1, s.amount, 0
    );

    v_next := case s.recurrence_interval
      when 'quarterly' then (s.next_issue_date + interval '3 months')::date
      when 'annual' then (s.next_issue_date + interval '1 year')::date
      else (s.next_issue_date + interval '1 month')::date
    end;

    v_remaining := s.occurrences_remaining;
    if v_remaining is not null then
      v_remaining := v_remaining - 1;
    end if;

    v_active := true;
    if v_remaining is not null and v_remaining <= 0 then
      v_active := false;
    end if;
    if s.recurrence_end_date is not null and v_next > s.recurrence_end_date then
      v_active := false;
    end if;

    update public.recurring_invoices
       set last_generated_invoice_id = v_invoice,
           last_generated_at = now(),
           next_issue_date = v_next,
           occurrences_remaining = v_remaining,
           is_active = v_active,
           updated_at = now()
     where id = s.id;

    schedule_id := s.id;
    invoice_id := v_invoice;
    return next;
  end loop;
end;
$$;

grant execute on function public.generate_due_recurring_invoices() to service_role;
grant execute on function public.generate_due_recurring_invoices() to authenticated;

-- ---------------------------------------------------------------------------
-- Admin-only log type for "drafts waiting". Never used for client mail.
-- ---------------------------------------------------------------------------
alter table public.notifications_log
  drop constraint if exists notifications_log_type_check;

alter table public.notifications_log
  add constraint notifications_log_type_check
  check (type = any (array[
    'push'::text,
    'email'::text,
    'whatsapp'::text,
    'application_confirmation'::text,
    'document_expiry'::text,
    'application_received'::text,
    'application_reminder'::text,
    'new_application'::text,
    'application_info_requested'::text,
    'application_approved'::text,
    'application_rejected'::text,
    'quote_sent'::text,
    'quote_accepted'::text,
    'quote_declined'::text,
    'payment_proof_uploaded'::text,
    'payment_proof_rejected'::text,
    'training_request'::text,
    'dog_birthday'::text,
    'issue_reported'::text,
    'issue_captured'::text,
    'dog_shared'::text,
    'handover_pack_sent'::text,
    'owner_photo_reminder'::text,
    'dog_deceased_reported'::text,
    'recurring_invoice_draft'::text
  ]));

-- ---------------------------------------------------------------------------
-- Cron: daily 07:30 SAST. Dashboard Cron is the fallback if pg_cron is absent.
-- ---------------------------------------------------------------------------
create or replace function public.trigger_generate_recurring_invoices()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_key text;
begin
  v_url := current_setting('app.settings.supabase_url', true);
  v_key := current_setting('app.settings.service_role_key', true);
  if v_url is null or v_key is null then
    select decrypted_secret into v_url
      from vault.decrypted_secrets where name = 'supabase_url' limit 1;
    select decrypted_secret into v_key
      from vault.decrypted_secrets where name = 'service_role_key' limit 1;
  end if;
  if coalesce(v_url, '') = '' or coalesce(v_key, '') = '' then
    raise notice 'generate-recurring-invoices: missing url/key — configure Dashboard Cron';
    return;
  end if;
  perform net.http_post(
    url := rtrim(v_url, '/') || '/functions/v1/generate-recurring-invoices',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := '{}'::jsonb
  );
exception when others then
  raise notice 'trigger_generate_recurring_invoices: %', sqlerrm;
end;
$$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'generate-recurring-invoices-daily') then
      perform cron.unschedule('generate-recurring-invoices-daily');
    end if;
    perform cron.schedule(
      'generate-recurring-invoices-daily',
      '30 7 * * *',
      $cron$ select public.trigger_generate_recurring_invoices(); $cron$
    );
  end if;
exception when others then
  raise notice 'Could not schedule generate-recurring-invoices-daily (%). Use Dashboard Cron.', sqlerrm;
end $$;
