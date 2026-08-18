-- Log rate-limit blocks. Skip SECURITY_ inserts and error_events self-blocks.

create or replace function public.trg_rate_limit_insert()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  action text;
  max_n int;
  window_s int;
begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  if tg_table_name = 'error_events' and new.code like 'SECURITY_%' then
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
$$;

create or replace function public.trg_rate_limit_documents()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;
  if new.bucket_id = 'documents' then
    if not public.check_rate_limit(
      'document_upload',
      public.rate_limit_request_key('document_upload'),
      20,
      3600
    ) then
      perform public.log_security_event('SECURITY_RATE_LIMIT', 'upload', 'warning',
        'Rate limit blocked document upload', jsonb_build_object('action', 'document_upload'),
        'document_upload');
      raise exception '%', public.rate_limit_blocked_message() using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;
