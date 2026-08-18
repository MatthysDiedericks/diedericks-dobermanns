-- Phase 3: security log on error_events, alerts, bot-free daily view.
-- Do not revoke EXECUTE on is_admin() or is_trainer_or_above().

create or replace function public.log_security_event(
  p_code text,
  p_area text default 'other',
  p_severity text default 'warning',
  p_message text default null,
  p_detail jsonb default '{}'::jsonb,
  p_fn text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.error_events (
    code, area, severity, message, detail, surface, actor_role, route
  ) values (
    left(coalesce(p_code, 'SECURITY_RPC_DENIED'), 120),
    coalesce(nullif(p_area, ''), 'other'),
    coalesce(nullif(p_severity, ''), 'warning'),
    left(p_message, 2000),
    coalesce(p_detail, '{}'::jsonb) || jsonb_build_object('fn', p_fn),
    'server',
    coalesce(auth.role(), 'anon'),
    left(p_fn, 500)
  );
exception when others then
  null;
end;
$$;

grant execute on function public.log_security_event(text, text, text, text, jsonb, text)
  to anon, authenticated, service_role;

create or replace function public.security_require_admin(p_fn text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() then
    return;
  end if;
  perform public.log_security_event(
    'SECURITY_RPC_DENIED', 'admin', 'warning',
    'Admin RPC refused', jsonb_build_object('fn', p_fn), p_fn
  );
  raise exception 'admin only' using errcode = '42501';
end;
$$;

grant execute on function public.security_require_admin(text)
  to anon, authenticated, service_role;

create or replace function public.error_events_flood_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  n int;
begin
  if new.code like 'SECURITY_%' then
    return new;
  end if;
  if new.session_ref is null or length(trim(new.session_ref)) = 0 then
    return new;
  end if;
  select count(*) into n
    from public.error_events
   where session_ref = new.session_ref
     and occurred_at > now() - interval '1 hour';
  if n >= 20 then
    return null;
  end if;
  return new;
end;
$$;

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
    'AUTH_REGISTRATION_BLOCKED',
    'QUOTE_TOTAL_MISMATCH',
    'QUOTE_LINE_DROPPED'
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

create or replace view public.page_view_daily as
select
  viewed_on,
  count(*)::bigint as views,
  count(distinct visitor_hash)::bigint as visitors
from public.page_views
where coalesce(is_bot, false) = false
group by viewed_on;

grant select on public.page_view_daily to authenticated;
