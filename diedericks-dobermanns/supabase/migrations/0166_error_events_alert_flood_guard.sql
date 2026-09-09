-- Cap error_events push alerts at 10/hour per code, and let a client ask
-- whether they already confirmed delivery (boolean only — no event rows).
-- 0165 alerting list is unchanged. Do not revoke EXECUTE on RLS helpers.

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
  -- Push flood cap. The INSERT has already landed (AFTER INSERT trigger);
  -- this only skips net.http_post. Count includes the row that just arrived.
  select count(*) into v_n
    from public.error_events
   where code = new.code
     and occurred_at > now() - interval '1 hour';
  if coalesce(v_n, 0) > 10 then
    return new;
  end if;

  if new.code = 'SECURITY_AUTH_LOCKOUT' then
    v_fire := true;
  elsif new.code = 'SECURITY_RATE_LIMIT' then
    -- 0165 waited until > 20/hour. The uniform 10/hour cap above now covers this code too.
    v_fire := true;
  elsif new.code in (
    'AUTH_SIGNUP_PHANTOM',
    'QUOTE_TOTAL_MISMATCH',
    'QUOTE_LINE_DROPPED',
    'PAYMENT_PROOF_UPLOADED',
    'DELIVERY_CONFIRMED_BY_CLIENT',
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

-- True only for a dog this caller already owns (my_dog_ids) and an unresolved
-- DELIVERY_CONFIRMED_BY_CLIENT row. Clients cannot read error_events (is_admin).
create or replace function public.client_already_confirmed_delivery(p_dog_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
begin
  if auth.uid() is null or p_dog_id is null then
    return false;
  end if;
  if not exists (
    select 1 from public.my_dog_ids() as ids
     where ids = p_dog_id
  ) then
    return false;
  end if;
  return exists (
    select 1
      from public.error_events e
     where e.code = 'DELIVERY_CONFIRMED_BY_CLIENT'
       and e.entity_id = p_dog_id::text
       and e.resolved_at is null
  );
end;
$$;

comment on function public.client_already_confirmed_delivery(uuid) is
  'Boolean only: this authenticated client already logged an unresolved delivery confirmation for their dog.';

revoke all on function public.client_already_confirmed_delivery(uuid) from public, anon;
grant execute on function public.client_already_confirmed_delivery(uuid) to authenticated;
grant execute on function public.client_already_confirmed_delivery(uuid) to service_role;
