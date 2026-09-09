-- Page Matt when a client confirms they have received their puppy.
-- Same trigger body as 0152, plus DELIVERY_CONFIRMED_BY_CLIENT.

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
