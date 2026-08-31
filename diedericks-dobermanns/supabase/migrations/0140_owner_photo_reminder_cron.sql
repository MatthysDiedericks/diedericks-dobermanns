-- Schedule owner photo reminders daily (email + notifications_log only; no WhatsApp).
-- Condolence messages are never scheduled — Matt must press send.

create or replace function public.trigger_owner_photo_reminders_check()
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
    -- Fall back to vault / supabase internal patterns used by other crons
    select decrypted_secret into v_url
      from vault.decrypted_secrets where name = 'supabase_url' limit 1;
    select decrypted_secret into v_key
      from vault.decrypted_secrets where name = 'service_role_key' limit 1;
  end if;
  if coalesce(v_url, '') = '' or coalesce(v_key, '') = '' then
    raise notice 'owner-photo-reminders: missing url/key — configure Dashboard Cron';
    return;
  end if;
  perform net.http_post(
    url := rtrim(v_url, '/') || '/functions/v1/owner-photo-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body := '{}'::jsonb
  );
exception when others then
  raise notice 'trigger_owner_photo_reminders_check: %', sqlerrm;
end;
$$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'owner-photo-reminders-daily') then
      perform cron.unschedule('owner-photo-reminders-daily');
    end if;
    perform cron.schedule(
      'owner-photo-reminders-daily',
      '15 7 * * *',
      $cron$ select public.trigger_owner_photo_reminders_check(); $cron$
    );
  end if;
exception when others then
  raise notice 'Could not schedule owner-photo-reminders-daily (%). Use Dashboard Cron.', sqlerrm;
end $$;
