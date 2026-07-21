-- ============================================================================
-- Document expiry reminders — the first scheduled automation in this project.
-- Sets the pattern for future scheduled features (heat-cycle reminders,
-- vaccination due dates, etc): a dedupe timestamp column + a daily trigger
-- that calls a check-* Edge Function via the existing pg_net / private
-- config pattern from 0005_notifications.sql.
--
--   * `documents.expiry_reminder_sent_at` — set once a reminder has been sent
--     for a document, so the daily check doesn't re-fire the same reminder
--     every day for the two weeks leading up to expiry.
--   * Adds 'document_expiry' to the notifications_log type check — the
--     in-app half of the reminder (the email half is sent directly from the
--     Edge Function via Resend, matching the existing inline pattern in
--     supabase/functions/notify and supabase/functions/send-broadcast).
--   * Attempts to enable pg_cron (pg_net is already enabled) and schedule a
--     daily 07:00 job that calls check-document-expiry. The job reads the
--     Edge Function URL/service-role key from private.app_config — the same
--     table dispatch_notification() already uses — so no secret ever lives
--     in this migration file or in cron.job.command.
--   * If pg_cron cannot be enabled on this project's tier, the DO block below
--     raises a NOTICE and schedules nothing. In that case, configure the
--     equivalent schedule manually via Supabase Dashboard -> Project ->
--     Integrations -> Cron, invoking the `check-document-expiry` Edge
--     Function on '0 7 * * *' (daily at 07:00).
-- ============================================================================

alter table public.documents
  add column if not exists expiry_reminder_sent_at timestamptz;

alter table public.notifications_log drop constraint if exists notifications_log_type_check;
alter table public.notifications_log add constraint notifications_log_type_check
  check (type in ('push', 'email', 'whatsapp', 'application_confirmation', 'document_expiry'));

-- Best-effort: not every project tier allows enabling pg_cron. Failure here
-- must not block the rest of this migration.
do $$
begin
  create extension if not exists pg_cron;
exception when others then
  raise notice 'pg_cron could not be enabled on this project (%). Use Supabase Dashboard -> Integrations -> Cron instead.', sqlerrm;
end;
$$;

-- Reads the same private.app_config keys dispatch_notification() uses
-- (0005_notifications.sql) so no secrets live in source control.
create or replace function public.trigger_document_expiry_check()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_key text;
begin
  select value into v_url from private.app_config where key = 'edge_base_url';
  select value into v_key from private.app_config where key = 'service_role_key';

  if v_url is null or v_key is null then
    raise notice 'private.app_config edge_base_url/service_role_key not set — skipping document expiry check.';
    return;
  end if;

  perform net.http_post(
    url => v_url || '/functions/v1/check-document-expiry',
    headers => jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body => '{}'::jsonb
  );
end;
$$;

-- Only schedules if pg_cron actually enabled above; wrapped defensively so a
-- scheduling failure (e.g. insufficient privilege on this tier) can't fail
-- the migration either.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'check-document-expiry-daily') then
      perform cron.unschedule('check-document-expiry-daily');
    end if;
    perform cron.schedule(
      'check-document-expiry-daily',
      '0 7 * * *',
      $cron$ select public.trigger_document_expiry_check(); $cron$
    );
  end if;
exception when others then
  raise notice 'Could not schedule check-document-expiry-daily (%). Use Supabase Dashboard -> Integrations -> Cron instead.', sqlerrm;
end;
$$;
