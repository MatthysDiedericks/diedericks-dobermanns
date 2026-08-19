-- Capture of the live trg_rate_limit_insert body (18 Aug 2026).
-- Applied by hand on production after 0098: `new.code` exists only on
-- error_events, and SQL AND does not short-circuit, so the 0098 form
-- aborted every insert on applications, enquiries and signup_failures.
-- Re-applying this file must be a no-op. Do not rewrite the SECURITY_
-- guard to use new.code. Never revoke EXECUTE on is_admin().

create or replace function public.trg_rate_limit_insert()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  action text;
  max_n int;
  window_s int;
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  -- NOTE: `new` has no `code` column on applications/enquiries/signup_failures.
  -- SQL boolean AND does not short-circuit, so `tg_table_name = 'error_events' and new.code ...`
  -- failed to resolve on every other table and blocked ALL inserts. Read it via to_jsonb,
  -- which is valid for any record shape. Do not reintroduce a direct new.code reference here.
  if tg_table_name = 'error_events'
     and coalesce(to_jsonb(new) ->> 'code', '') like 'SECURITY_%' then
    return new;
  end if;

  if tg_table_name = 'applications' then
    action := 'application'; max_n := 3; window_s := 3600;
    if not public.check_rate_limit(action, public.rate_limit_request_key(action), max_n, window_s) then
      perform public.log_security_event('SECURITY_RATE_LIMIT', 'other', 'warning',
        'Rate limit blocked application', jsonb_build_object('action', action), action);
      raise exception '%', public.rate_limit_blocked_message() using errcode = 'P0001';
    end if;
    if not public.check_rate_limit(action || '_day', public.rate_limit_request_key(action || '_day'), 5, 86400) then
      perform public.log_security_event('SECURITY_RATE_LIMIT', 'other', 'warning',
        'Rate limit blocked application (day)', jsonb_build_object('action', action || '_day'), action);
      raise exception '%', public.rate_limit_blocked_message() using errcode = 'P0001';
    end if;
  elsif tg_table_name = 'enquiries' then
    action := 'enquiry';
    if not public.check_rate_limit(action, public.rate_limit_request_key(action), 5, 3600) then
      perform public.log_security_event('SECURITY_RATE_LIMIT', 'other', 'warning',
        'Rate limit blocked enquiry', jsonb_build_object('action', action), action);
      raise exception '%', public.rate_limit_blocked_message() using errcode = 'P0001';
    end if;
  elsif tg_table_name = 'error_events' then
    action := 'error_events';
    if not public.check_rate_limit(action, public.rate_limit_request_key(action), 60, 3600) then
      raise exception '%', public.rate_limit_blocked_message() using errcode = 'P0001';
    end if;
  elsif tg_table_name = 'signup_failures' then
    action := 'signin_failure';
    if not public.check_rate_limit(action, public.rate_limit_request_key(action), 10, 900) then
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
