-- Auto-resolve stale warnings and quiet errors so the daily digest cannot
-- rebuild a backlog of already-fixed events. Criticals stay open for a person.
-- Also stop paging Matt for AUTH_REGISTRATION_BLOCKED (invite-only by design).

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
  if coalesce(current_setting('request.jwt.claims', true), '') <> ''
     and not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

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
      'QUOTE_TOTAL_MISMATCH', 'quote', 'warning',
      'Nightly sweep: quote subtotal disagrees with line sum',
      jsonb_build_object('header_subtotal', r.header_subtotal, 'lines_subtotal', r.lines_subtotal, 'source', 'nightly_sweep'),
      'server', 'system', 'quote', r.id::text
    );
    n := n + 1;
  end loop;

  for r in
    select i.id, i.total_amount, coalesce(sum(p.amount), 0) as paid
      from public.invoices i
      left join public.payments p on p.invoice_id = i.id
     group by i.id, i.total_amount
    having coalesce(sum(p.amount), 0) > coalesce(i.total_amount, 0) + 0.009
     limit 50
  loop
    insert into public.error_events (code, area, severity, message, detail, surface, actor_role, entity_type, entity_id)
    values (
      'PAYMENT_OVER_ALLOCATED', 'payment', 'critical',
      'Nightly sweep: payments exceed invoice total',
      jsonb_build_object('total_amount', r.total_amount, 'paid', r.paid, 'source', 'nightly_sweep'),
      'server', 'system', 'invoice', r.id::text
    );
    n := n + 1;
  end loop;

  begin
    for r in
      select d.id, d.storage_path
        from public.documents d
       where d.storage_path is not null and d.storage_path <> ''
         and not exists (
           select 1 from storage.objects o
            where o.bucket_id = 'documents' and o.name = d.storage_path
         )
       limit 50
    loop
      insert into public.error_events (code, area, severity, message, detail, surface, actor_role, entity_type, entity_id)
      values (
        'UPLOAD_OBJECT_MISSING', 'upload', 'warning',
        'Nightly sweep: documents row has no storage object',
        jsonb_build_object('storage_path', r.storage_path, 'bucket', 'documents', 'source', 'nightly_sweep'),
        'server', 'system', 'document', r.id::text
      );
      n := n + 1;
    end loop;
  exception when others then
    null;
  end;

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
        'CHECKIN_NOT_CONTACTABLE', 'admin', 'warning',
        'Nightly sweep: check_in exists for non-contactable dog',
        jsonb_build_object('dog_id', r.dog_id, 'source', 'nightly_sweep'),
        'server', 'system', 'check_in', r.id::text
      );
      n := n + 1;
    end loop;
  exception when others then
    null;
  end;

  -- Warnings: close the row itself once it is a week old.
  update public.error_events
     set resolved_at = now(),
         resolution_note = 'Auto-resolved: warning, no recurrence in 7 days.'
   where resolved_at is null
     and severity = 'warning'
     and occurred_at < now() - interval '7 days';

  -- Errors: close every open row of a code whose newest occurrence is older
  -- than 14 days. Weekly noise never closes; a one-off that stayed quiet does.
  -- Criticals are never touched here.
  update public.error_events e
     set resolved_at = now(),
         resolution_note = 'Auto-resolved: no recurrence in 14 days.'
   where e.resolved_at is null
     and e.severity = 'error'
     and not exists (
       select 1
         from public.error_events newest
        where newest.code = e.code
          and newest.occurred_at >= now() - interval '14 days'
     );

  return n;
end;
$$;

grant execute on function public.sweep_error_consistency() to authenticated, service_role;

create or replace function public.error_events_maybe_alert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
  v_n int;
  v_fire boolean := false;
begin
  if new.code = 'SECURITY_AUTH_LOCKOUT' then
    v_fire := true;
  elsif new.code = 'SECURITY_RATE_LIMIT' then
    select count(*) into v_n
      from public.error_events
     where code = 'SECURITY_RATE_LIMIT'
       and occurred_at > now() - interval '1 hour';
    v_fire := coalesce(v_n, 0) > 20;
  elsif new.code in (
    'AUTH_SIGNUP_PHANTOM',
    'QUOTE_TOTAL_MISMATCH',
    'QUOTE_LINE_DROPPED',
    'PAYMENT_PROOF_UPLOADED',
    'APPLY_DB_ERROR',
    'APPLY_UNHANDLED',
    'QUOTE_SAVE_FAILED',
    'QUOTE_UNHANDLED'
  ) or (new.area = 'payment' and new.severity = 'critical') then
    v_fire := true;
  end if;

  if not v_fire then
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
    null;
  end;
  return new;
end;
$$;
