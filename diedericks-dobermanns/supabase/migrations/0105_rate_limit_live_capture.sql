-- Capture of live rate-limit work that was applied by hand (already live).
-- 1. rate_limit_client_key — server routes hash the real client IP with the
--    same salt as the trigger (anon inserts still use rate_limit_request_key).
-- 2. trg_rate_limit_insert — 19 Aug ceilings, log_security_event on blocks,
--    SECURITY_% bypass via to_jsonb. Never new.code.
-- 3. 0095b recorded in the ledger if the name is still blank.
-- Re-applying this file is a no-op. Never revoke EXECUTE on is_admin().

create or replace function public.rate_limit_client_key(
  p_action text,
  p_client_ip text,
  p_user_agent text
)
returns text
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  salt text;
begin
  select s.salt into salt from public.rate_limit_secrets s where s.id;
  return encode(
    digest(
      coalesce(salt, '') || ':' ||
      coalesce(btrim(p_client_ip), '') || ':' ||
      coalesce(p_user_agent, '') || ':' ||
      coalesce(p_action, ''),
      'sha256'
    ),
    'hex'
  );
end;
$$;

revoke all on function public.rate_limit_client_key(text, text, text) from public;
grant execute on function public.rate_limit_client_key(text, text, text) to service_role;

create or replace function public.trg_rate_limit_insert()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  action text;
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if tg_table_name = 'error_events'
     and coalesce(to_jsonb(new) ->> 'code', '') like 'SECURITY_%' then
    return new;
  end if;

  if tg_table_name = 'applications' then
    action := 'application';
    if not public.check_rate_limit(action, public.rate_limit_request_key(action), 50, 3600) then
      perform public.log_security_event('SECURITY_RATE_LIMIT', 'other', 'warning',
        'Rate limit blocked application', jsonb_build_object('action', action), action);
      raise exception '%', public.rate_limit_blocked_message() using errcode = 'P0001';
    end if;
    if not public.check_rate_limit(action || '_day', public.rate_limit_request_key(action || '_day'), 200, 86400) then
      perform public.log_security_event('SECURITY_RATE_LIMIT', 'other', 'warning',
        'Rate limit blocked application (day)', jsonb_build_object('action', action || '_day'), action);
      raise exception '%', public.rate_limit_blocked_message() using errcode = 'P0001';
    end if;
  elsif tg_table_name = 'enquiries' then
    action := 'enquiry';
    if not public.check_rate_limit(action, public.rate_limit_request_key(action), 100, 3600) then
      perform public.log_security_event('SECURITY_RATE_LIMIT', 'other', 'warning',
        'Rate limit blocked enquiry', jsonb_build_object('action', action), action);
      raise exception '%', public.rate_limit_blocked_message() using errcode = 'P0001';
    end if;
  elsif tg_table_name = 'error_events' then
    action := 'error_events';
    if not public.check_rate_limit(action, public.rate_limit_request_key(action), 300, 3600) then
      raise exception '%', public.rate_limit_blocked_message() using errcode = 'P0001';
    end if;
  elsif tg_table_name = 'signup_failures' then
    action := 'signin_failure';
    if not public.check_rate_limit(action, public.rate_limit_request_key(action), 60, 900) then
      perform public.log_security_event('SECURITY_AUTH_LOCKOUT', 'auth', 'error',
        'Sign-in locked after repeated failures', jsonb_build_object('action', action), action);
      raise exception '%', public.rate_limit_blocked_message() using errcode = 'P0001';
    end if;
  end if;

  return new;
end;
$function$;

grant execute on function public.is_admin() to public, anon, authenticated, service_role;
grant execute on function public.is_trainer_or_above() to public, anon, authenticated, service_role;

insert into supabase_migrations.schema_migrations (version, name)
values ('0095b', 'drop_public_media_list')
on conflict (version) do update
   set name = excluded.name
 where schema_migrations.name is null
    or btrim(schema_migrations.name) = '';

insert into supabase_migrations.schema_migrations (version, name)
values ('0105', 'rate_limit_live_capture')
on conflict (version) do nothing;
