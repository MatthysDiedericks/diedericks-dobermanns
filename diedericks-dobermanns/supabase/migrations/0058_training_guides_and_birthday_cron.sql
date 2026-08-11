-- ============================================================================
-- Portal owner experience: training_guides library + daily birthday greetings.
--
-- * training_guides — published articles for /portal/training/guides and the
--   per-dog age-filtered plan. Seed nothing; content is written in admin.
-- * notifications_log — add dog_birthday + training_request (dog_birthday may
--   already exist in live DB; this re-asserts the full allowed set).
-- * Daily cron calling send-birthday-greetings Edge Function, mirroring
--   check-document-expiry-daily / trigger_document_expiry_check().
--
-- DO NOT apply from Cursor — apply manually in Supabase when ready.
-- ============================================================================

create table if not exists public.training_guides (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  summary text,
  body_html text not null default '',
  category text not null default 'general',
  min_age_weeks integer,
  max_age_weeks integer,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists training_guides_published_sort_idx
  on public.training_guides (is_published, sort_order);

alter table public.training_guides enable row level security;

drop policy if exists "Anyone authenticated can read published training guides" on public.training_guides;
create policy "Anyone authenticated can read published training guides"
  on public.training_guides
  for select
  to authenticated
  using (is_published = true or public.is_admin());

drop policy if exists "Admins manage training guides" on public.training_guides;
create policy "Admins manage training guides"
  on public.training_guides
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Full type list from 0053 plus dog_birthday + training_request.
alter table public.notifications_log drop constraint if exists notifications_log_type_check;
alter table public.notifications_log add constraint notifications_log_type_check
  check (type in (
    'push', 'email', 'whatsapp', 'application_confirmation', 'document_expiry',
    'application_received', 'application_reminder', 'new_application',
    'application_info_requested', 'application_approved', 'application_rejected',
    'quote_sent', 'quote_accepted', 'quote_declined',
    'payment_proof_uploaded', 'payment_proof_rejected',
    'dog_birthday', 'training_request'
  ));

create or replace function public.trigger_birthday_greetings_check()
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
    raise notice 'private.app_config edge_base_url/service_role_key not set — skipping birthday greetings.';
    return;
  end if;

  perform net.http_post(
    url => v_url || '/functions/v1/send-birthday-greetings',
    headers => jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body => '{}'::jsonb
  );
end;
$$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'send-birthday-greetings-daily') then
      perform cron.unschedule('send-birthday-greetings-daily');
    end if;
    perform cron.schedule(
      'send-birthday-greetings-daily',
      '15 7 * * *',
      $cron$ select public.trigger_birthday_greetings_check(); $cron$
    );
  end if;
exception when others then
  raise notice 'Could not schedule send-birthday-greetings-daily (%). Use Supabase Dashboard Cron instead.', sqlerrm;
end;
$$;
