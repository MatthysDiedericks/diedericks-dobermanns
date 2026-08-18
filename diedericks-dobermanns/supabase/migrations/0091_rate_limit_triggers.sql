-- Enforce rate limits on anonymous insert paths. Skip service_role (Next.js admin client).

create or replace function public.rate_limit_blocked_message()
returns text
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  wa text;
begin
  select value into wa from public.app_settings
   where key in ('contact_whatsapp', 'social_whatsapp')
     and value is not null and btrim(value) <> ''
   order by case key when 'contact_whatsapp' then 0 else 1 end
   limit 1;
  return format(
    'Too many attempts — try again in 12 minutes, or WhatsApp us on %s',
    coalesce(nullif(btrim(wa), ''), 'the number on diedericksdobermanns.com')
  );
end;
$$;

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

  if tg_table_name = 'applications' then
    action := 'application'; max_n := 3; window_s := 3600;
    if not public.check_rate_limit(action, public.rate_limit_request_key(action), max_n, window_s) then
      raise exception '%', public.rate_limit_blocked_message() using errcode = 'P0001';
    end if;
    if not public.check_rate_limit(action || '_day', public.rate_limit_request_key(action || '_day'), 5, 86400) then
      raise exception '%', public.rate_limit_blocked_message() using errcode = 'P0001';
    end if;
  elsif tg_table_name = 'enquiries' then
    action := 'enquiry';
    if not public.check_rate_limit(action, public.rate_limit_request_key(action), 5, 3600) then
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
      raise exception '%', public.rate_limit_blocked_message() using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_rate_limit_applications on public.applications;
create trigger trg_rate_limit_applications
  before insert on public.applications
  for each row execute function public.trg_rate_limit_insert();

drop trigger if exists trg_rate_limit_enquiries on public.enquiries;
create trigger trg_rate_limit_enquiries
  before insert on public.enquiries
  for each row execute function public.trg_rate_limit_insert();

drop trigger if exists trg_rate_limit_error_events on public.error_events;
create trigger trg_rate_limit_error_events
  before insert on public.error_events
  for each row execute function public.trg_rate_limit_insert();

drop trigger if exists trg_rate_limit_signup_failures on public.signup_failures;
create trigger trg_rate_limit_signup_failures
  before insert on public.signup_failures
  for each row execute function public.trg_rate_limit_insert();

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
      raise exception '%', public.rate_limit_blocked_message() using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_rate_limit_documents on storage.objects;
create trigger trg_rate_limit_documents
  before insert on storage.objects
  for each row execute function public.trg_rate_limit_documents();

grant execute on function public.rate_limit_blocked_message() to anon, authenticated, service_role;
grant execute on function public.is_admin() to public, anon, authenticated, service_role;
grant execute on function public.is_trainer_or_above() to public, anon, authenticated, service_role;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'purge-rate-limit-buckets') then
      perform cron.unschedule('purge-rate-limit-buckets');
    end if;
    perform cron.schedule(
      'purge-rate-limit-buckets',
      '20 5 * * *',
      $cron$delete from public.rate_limit_buckets
        where window_start < now() - interval '24 hours'
          and (blocked_until is null or blocked_until < now());$cron$
    );
  end if;
exception when others then
  raise notice 'Could not schedule rate-limit purge (%).', sqlerrm;
end;
$$;
