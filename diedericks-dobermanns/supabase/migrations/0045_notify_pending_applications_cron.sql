-- Daily 07:00 SAST (05:00 UTC) reminder for applications still `submitted`.
-- Mirrors the exact live pattern used by check-document-expiry-daily
-- (cron.job id 1): net.http_post + a service-role key read from
-- vault.decrypted_secrets, never inlined here. The secret
-- 'notify_pending_applications_service_key' was seeded out-of-band (not in
-- this file) via `select vault.create_secret(...)`.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'notify-pending-applications-daily') then
      perform cron.unschedule('notify-pending-applications-daily');
    end if;
    perform cron.schedule(
      'notify-pending-applications-daily',
      '0 5 * * *',
      $cron$
      select net.http_post(
        url := 'https://nlmwxodvquwbjinhhbmr.supabase.co/functions/v1/notify-pending-applications',
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
  end if;
exception when others then
  raise notice 'Could not schedule notify-pending-applications-daily (%). Use Supabase Dashboard -> Integrations -> Cron instead.', sqlerrm;
end;
$$;
