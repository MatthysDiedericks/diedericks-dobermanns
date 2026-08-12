-- 0065 — Persistent failure trail (error_events).
-- Lands in Postgres so registration / quote / payment failures survive log retention.
-- No audit trigger: auditing this table doubles noise and adds nothing.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table if not exists public.error_events (
  id              bigserial primary key,
  occurred_at     timestamptz not null default now(),
  code            text not null,
  area            text not null check (area in
                    ('auth','quote','invoice','payment','contract','upload','portal','admin','app','other')),
  severity        text not null default 'error' check (severity in ('warning','error','critical')),
  message         text,
  detail          jsonb,
  surface         text check (surface is null or surface in ('website','app','server','script')),
  route           text,
  actor_role      text,
  actor_id        uuid,
  email_domain    text,
  session_ref     text,
  entity_type     text,
  entity_id       text,
  resolved_at     timestamptz,
  resolved_by     uuid references auth.users(id),
  resolution_note text
);

create index if not exists error_events_recent_idx
  on public.error_events (occurred_at desc);
create index if not exists error_events_code_idx
  on public.error_events (code, occurred_at desc);
create index if not exists error_events_open_idx
  on public.error_events (occurred_at desc)
  where resolved_at is null;
create index if not exists error_events_session_idx
  on public.error_events (session_ref, occurred_at desc)
  where session_ref is not null;

comment on table public.error_events is
  'Internal failure trail. Never store passwords, tokens, or full email addresses.';

-- ---------------------------------------------------------------------------
-- RLS — anon/authenticated insert only; admin select/update; no delete
-- ---------------------------------------------------------------------------
alter table public.error_events enable row level security;

drop policy if exists error_events_insert_anon on public.error_events;
create policy error_events_insert_anon on public.error_events
  for insert to anon, authenticated
  with check (true);

drop policy if exists error_events_select_admin on public.error_events;
create policy error_events_select_admin on public.error_events
  for select to authenticated
  using (public.is_admin());

drop policy if exists error_events_update_admin on public.error_events;
create policy error_events_update_admin on public.error_events
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

grant select, insert, update on public.error_events to authenticated;
grant insert on public.error_events to anon;
grant usage, select on sequence public.error_events_id_seq to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Flood guard — silently drop inserts over ~20 per session_ref per hour
-- ---------------------------------------------------------------------------
create or replace function public.error_events_flood_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  if new.session_ref is null or length(trim(new.session_ref)) = 0 then
    return new;
  end if;

  select count(*) into n
    from public.error_events
   where session_ref = new.session_ref
     and occurred_at > now() - interval '1 hour';

  if n >= 20 then
    return null; -- skip insert, no exception to the client
  end if;

  return new;
end;
$$;

drop trigger if exists trg_error_events_flood on public.error_events;
create trigger trg_error_events_flood
  before insert on public.error_events
  for each row execute function public.error_events_flood_guard();

-- ---------------------------------------------------------------------------
-- Immediate-alert codes — edge function notified via pg_net (deduped in EF)
-- ---------------------------------------------------------------------------
create or replace function public.error_events_maybe_alert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
begin
  if new.code not in (
    'AUTH_SIGNUP_PHANTOM',
    'AUTH_REGISTRATION_BLOCKED',
    'QUOTE_TOTAL_MISMATCH',
    'QUOTE_LINE_DROPPED'
  ) and not (new.area = 'payment' and new.severity = 'critical') then
    return new;
  end if;

  begin
    select decrypted_secret into v_secret
      from vault.decrypted_secrets
     where name = 'notify_pending_applications_service_key'
     limit 1;

    if v_secret is null then
      return new;
    end if;

    perform net.http_post(
      url := 'https://nlmwxodvquwbjinhhbmr.supabase.co/functions/v1/error-events-alert',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || v_secret,
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'id', new.id,
        'code', new.code,
        'area', new.area,
        'severity', new.severity,
        'message', new.message,
        'session_ref', new.session_ref,
        'email_domain', new.email_domain,
        'entity_type', new.entity_type,
        'entity_id', new.entity_id,
        'route', new.route,
        'surface', new.surface
      )
    );
  exception when others then
    -- Never fail the insert because alerting is down
    null;
  end;

  return new;
end;
$$;

drop trigger if exists trg_error_events_alert on public.error_events;
create trigger trg_error_events_alert
  after insert on public.error_events
  for each row execute function public.error_events_maybe_alert();

-- ---------------------------------------------------------------------------
-- Retention — resolved ≥ 6 months; unresolved ≥ 24 months
-- ---------------------------------------------------------------------------
create or replace function public.purge_old_error_events()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.error_events
   where resolved_at is not null
     and resolved_at < now() - interval '6 months';

  delete from public.error_events
   where resolved_at is null
     and occurred_at < now() - interval '24 months';
end;
$$;

-- Call from the existing nightly purge job (or the cron below). We do not
-- rewrite purge_old_audit_log body — its live definition is not in-repo.

-- ---------------------------------------------------------------------------
-- Nightly consistency sweep — log only, never blocks writes
-- ---------------------------------------------------------------------------
create or replace function public.sweep_error_consistency()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n int := 0;
  r record;
begin
  -- Quotes: header subtotal disagrees with sum of lines
  for r in
    select q.id,
           q.subtotal as header_subtotal,
           coalesce(sum(qi.quantity * qi.unit_price), 0) as lines_subtotal
      from public.quotes q
      left join public.quote_items qi on qi.quote_id = q.id
     group by q.id, q.subtotal
    having abs(coalesce(q.subtotal, 0) - coalesce(sum(qi.quantity * qi.unit_price), 0)) > 0.009
     limit 50
  loop
    insert into public.error_events (code, area, severity, message, detail, surface, actor_role, entity_type, entity_id)
    values (
      'QUOTE_TOTAL_MISMATCH',
      'quote',
      'warning',
      'Nightly sweep: quote subtotal disagrees with line sum',
      jsonb_build_object(
        'header_subtotal', r.header_subtotal,
        'lines_subtotal', r.lines_subtotal,
        'source', 'nightly_sweep'
      ),
      'server',
      'system',
      'quote',
      r.id::text
    );
    n := n + 1;
  end loop;

  -- Invoices: payments exceed total
  for r in
    select i.id,
           i.total_amount,
           coalesce(sum(p.amount), 0) as paid
      from public.invoices i
      left join public.payments p on p.invoice_id = i.id
     group by i.id, i.total_amount
    having coalesce(sum(p.amount), 0) > coalesce(i.total_amount, 0) + 0.009
     limit 50
  loop
    insert into public.error_events (code, area, severity, message, detail, surface, actor_role, entity_type, entity_id)
    values (
      'PAYMENT_OVER_ALLOCATED',
      'payment',
      'critical',
      'Nightly sweep: payments exceed invoice total',
      jsonb_build_object(
        'total_amount', r.total_amount,
        'paid', r.paid,
        'source', 'nightly_sweep'
      ),
      'server',
      'system',
      'invoice',
      r.id::text
    );
    n := n + 1;
  end loop;

  -- Documents rows with no storage object (best-effort)
  begin
    for r in
      select d.id, d.storage_path
        from public.documents d
       where d.storage_path is not null
         and d.storage_path <> ''
         and not exists (
           select 1 from storage.objects o
            where o.bucket_id = 'documents'
              and o.name = d.storage_path
         )
       limit 50
    loop
      insert into public.error_events (code, area, severity, message, detail, surface, actor_role, entity_type, entity_id)
      values (
        'UPLOAD_OBJECT_MISSING',
        'upload',
        'warning',
        'Nightly sweep: documents row has no storage object',
        jsonb_build_object(
          'storage_path', r.storage_path,
          'bucket', 'documents',
          'source', 'nightly_sweep'
        ),
        'server',
        'system',
        'document',
        r.id::text
      );
      n := n + 1;
    end loop;
  exception when others then
    null;
  end;

  -- check_ins for dogs that are not contactable
  begin
    for r in
      select c.id, c.dog_id
        from public.check_ins c
       where c.due_date > (current_date - 30)
         and not public.dog_is_contactable(c.dog_id)
       limit 50
    loop
      insert into public.error_events (code, area, severity, message, detail, surface, actor_role, entity_type, entity_id)
      values (
        'CHECKIN_NOT_CONTACTABLE',
        'admin',
        'warning',
        'Nightly sweep: check_in exists for non-contactable dog',
        jsonb_build_object('dog_id', r.dog_id, 'source', 'nightly_sweep'),
        'server',
        'system',
        'check_in',
        r.id::text
      );
      n := n + 1;
    end loop;
  exception when others then
    null;
  end;

  return n;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin resolve helper
-- ---------------------------------------------------------------------------
create or replace function public.resolve_error_events(
  p_ids bigint[],
  p_note text default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  if not public.is_admin() then
    raise exception 'not authorized';
  end if;

  update public.error_events
     set resolved_at = now(),
         resolved_by = auth.uid(),
         resolution_note = nullif(trim(p_note), '')
   where id = any (p_ids)
     and resolved_at is null;

  get diagnostics n = row_count;
  return n;
end;
$$;

-- ---------------------------------------------------------------------------
-- Daily digest cron (07:00 SAST = 05:00 UTC) — Matt/admins only via edge fn
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'error-events-digest-daily') then
      perform cron.unschedule('error-events-digest-daily');
    end if;
    perform cron.schedule(
      'error-events-digest-daily',
      '0 5 * * *',
      $cron$
      select net.http_post(
        url := 'https://nlmwxodvquwbjinhhbmr.supabase.co/functions/v1/error-events-digest',
        headers := jsonb_build_object(
          'Authorization', 'Bearer ' || (
            select decrypted_secret from vault.decrypted_secrets
            where name = 'notify_pending_applications_service_key'
          ),
          'Content-Type', 'application/json'
        ),
        body := '{}'::jsonb
      );
      $cron$
    );

    if exists (select 1 from cron.job where jobname = 'error-events-sweep-daily') then
      perform cron.unschedule('error-events-sweep-daily');
    end if;
    perform cron.schedule(
      'error-events-sweep-daily',
      '15 5 * * *',
      $cron$
      select public.sweep_error_consistency();
      select public.purge_old_error_events();
      $cron$
    );
  end if;
exception when others then
  raise notice 'Could not schedule error-events crons (%). Configure in Dashboard → Integrations → Cron.', sqlerrm;
end;
$$;
