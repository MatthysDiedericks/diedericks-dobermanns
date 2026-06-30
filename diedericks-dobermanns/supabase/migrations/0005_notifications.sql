-- ============================================================================
-- Notification automation
--   * Business triggers insert rows into notifications_log (the inbox/history).
--   * An AFTER INSERT trigger on notifications_log calls the `notify` Edge
--     Function (via pg_net) which performs the actual push/email/WhatsApp
--     delivery and writes back the delivery status.
--
-- The Edge Function URL and service-role key are read from a private config
-- table so no secrets live in source control. Populate it once after deploy:
--
--   insert into private.app_config (key, value) values
--     ('edge_base_url', 'https://<project-ref>.supabase.co'),
--     ('service_role_key', '<service-role-key>')
--   on conflict (key) do update set value = excluded.value;
-- ============================================================================

create extension if not exists pg_net;

-- Private config (never exposed via the API; no RLS policies = no client access)
create schema if not exists private;
create table if not exists private.app_config (
  key text primary key,
  value text not null
);

-- Helper: append a notification to a user's inbox -----------------------------
create or replace function public.queue_notification(
  p_recipient uuid,
  p_type text,
  p_subject text,
  p_body text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_recipient is null then
    return;
  end if;
  insert into public.notifications_log (recipient_id, type, subject, body, status)
  values (p_recipient, coalesce(p_type, 'push'), p_subject, p_body, 'sent');
end;
$$;

-- Dispatch: forward each new log row to the `notify` Edge Function ------------
create or replace function public.dispatch_notification()
returns trigger
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

  -- No backend configured yet — keep the inbox row, skip remote delivery.
  if v_url is null or v_key is null then
    return new;
  end if;

  perform net.http_post(
    url => v_url || '/functions/v1/notify',
    headers => jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    ),
    body => jsonb_build_object('record', to_jsonb(new))
  );
  return new;
end;
$$;

drop trigger if exists trg_dispatch_notification on public.notifications_log;
create trigger trg_dispatch_notification
  after insert on public.notifications_log
  for each row execute function public.dispatch_notification();

-- Business event: application status changes ---------------------------------
create or replace function public.on_application_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subject text;
  v_body text;
begin
  if new.status is distinct from old.status and new.user_id is not null then
    case new.status
      when 'under_review' then
        v_subject := 'Application under review';
        v_body := 'Good news — your application is now being reviewed by our team.';
      when 'approved' then
        v_subject := 'Application approved';
        v_body := 'Congratulations! Your application has been approved. We will be in touch with next steps.';
      when 'rejected' then
        v_subject := 'Application update';
        v_body := 'Thank you for your application. Unfortunately we are unable to proceed at this time.';
      when 'waitlisted' then
        v_subject := 'You are on the waiting list';
        v_body := 'Your application has been added to our waiting list. We will contact you as spaces open.';
      else
        v_subject := null;
    end case;

    if v_subject is not null then
      perform public.queue_notification(new.user_id, 'push', v_subject, v_body);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_application_status on public.applications;
create trigger trg_application_status
  after update of status on public.applications
  for each row execute function public.on_application_status_change();

-- Business event: reservation confirmed --------------------------------------
create or replace function public.on_reservation_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'confirmed' and old.status is distinct from new.status then
    perform public.queue_notification(
      new.client_id,
      'push',
      'Reservation confirmed',
      'Your reservation has been confirmed. We will share pickup and handover details soon.'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_reservation_confirmed on public.reservations;
create trigger trg_reservation_confirmed
  after update of status on public.reservations
  for each row execute function public.on_reservation_confirmed();

-- Business event: new training log -> notify the dog's reserved client --------
create or replace function public.on_training_log_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client uuid;
  v_dog_name text;
begin
  select r.client_id into v_client
  from public.reservations r
  where r.dog_id = new.dog_id and r.status in ('pending', 'confirmed')
  order by r.created_at desc
  limit 1;

  if v_client is not null then
    select name into v_dog_name from public.dogs where id = new.dog_id;
    perform public.queue_notification(
      v_client,
      'push',
      'Training update',
      coalesce(v_dog_name, 'Your dog') ||
        case when new.milestone is not null
          then ' reached a new milestone: ' || new.milestone
          else ' has a new training session logged.'
        end
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_training_log_insert on public.training_logs;
create trigger trg_training_log_insert
  after insert on public.training_logs
  for each row execute function public.on_training_log_insert();

-- Business event: litter born -> notify waiting-list clients ------------------
create or replace function public.on_litter_born()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  w record;
begin
  if new.status = 'born' and old.status is distinct from new.status then
    for w in
      select client_id from public.waiting_list
      where litter_id = new.id and status = 'active'
    loop
      perform public.queue_notification(
        w.client_id,
        'push',
        'New puppies have arrived',
        coalesce(new.name, 'A new litter') ||
          ' has been born. Waiting-list spaces are now opening — we will be in touch.'
      );
    end loop;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_litter_born on public.litters;
create trigger trg_litter_born
  after update of status on public.litters
  for each row execute function public.on_litter_born();
