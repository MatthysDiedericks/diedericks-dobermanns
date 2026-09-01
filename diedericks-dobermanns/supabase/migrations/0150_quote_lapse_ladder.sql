-- 0150 — Quote lapse ladder: remind at 30/60, lapse at valid_until (default 90).
-- Enforces the term already printed on the quote. Hold (0149) is checked first.

alter table public.quotes
  add column if not exists last_client_activity_at timestamptz,
  add column if not exists reminder_first_sent_at  timestamptz,
  add column if not exists reminder_final_sent_at  timestamptz,
  add column if not exists lapsed_at               timestamptz,
  add column if not exists lapse_reason            text;

comment on column public.quotes.last_client_activity_at is
  'Set when the buyer opens, accepts or uploads proof against this quote. Resets
   the lapse clock — silence is what lapses a quote, not elapsed time alone.';

alter table public.quotes drop constraint if exists quotes_lapse_hold_reason_required;
alter table public.quotes add constraint quotes_lapse_hold_reason_required
  check (lapse_hold_until is null or length(btrim(coalesce(lapse_hold_reason, ''))) >= 3);

insert into public.app_settings (key, value, description) values
  ('quote_reminder_first_days', '30', 'Days of silence after sent_at (or last client activity) before the first reminder.'),
  ('quote_reminder_final_days', '60', 'Days of silence before the final notice naming the lapse date.'),
  ('quote_lapse_days', '90', 'Default lapse window. Same promise as quote_validity_days; valid_until on the quote wins.'),
  ('quote_lapse_enabled', 'true', 'Kill switch. false stops reminders, expiry and dog release without a deploy.')
on conflict (key) do nothing;

alter table public.notifications_log drop constraint if exists notifications_log_type_check;
alter table public.notifications_log add constraint notifications_log_type_check
  check (type = any (array[
    'push','email','whatsapp','application_confirmation','document_expiry',
    'application_received','application_reminder','new_application',
    'application_info_requested','application_approved','application_rejected',
    'quote_sent','quote_accepted','quote_declined','quote_reminder_first',
    'quote_reminder_final','quote_lapsed','payment_proof_uploaded',
    'payment_proof_rejected','training_request','dog_birthday','issue_reported',
    'issue_captured','dog_shared','handover_pack_sent','owner_photo_reminder',
    'dog_deceased_reported','recurring_invoice_draft'
  ]));

create or replace function public.app_setting_int(p_key text, p_default int)
returns int language plpgsql stable set search_path = public as $$
declare v int;
begin
  select nullif(btrim(value), '')::int into v from public.app_settings where key = p_key;
  return coalesce(v, p_default);
exception when others then
  return p_default;
end;
$$;

create or replace function public.quote_lapse_enabled()
returns boolean language plpgsql stable set search_path = public as $$
declare v text;
begin
  select lower(btrim(value)) into v from public.app_settings where key = 'quote_lapse_enabled';
  return coalesce(v, 'true') not in ('false', '0', 'no', 'off');
end;
$$;

-- Clock restart: silence is measured from sent_at, or last_client_activity_at
-- when the buyer has opened / accepted / uploaded proof.
create or replace function public.quote_lapse_clock(p_sent timestamptz, p_activity timestamptz)
returns timestamptz language sql immutable as $$
  select greatest(p_sent, coalesce(p_activity, p_sent));
$$;

-- valid_until wins when it differs from the default 90. The document the buyer
-- holds is the promise; the setting is only used to compute it.
create or replace function public.quote_lapse_due_date(p_sent timestamptz, p_activity timestamptz, p_valid date)
returns date language plpgsql stable set search_path = public as $$
declare
  v_clock date := public.quote_lapse_clock(p_sent, p_activity)::date;
  v_days int;
begin
  if p_valid is not null and p_sent is not null then
    v_days := greatest(1, (p_valid - p_sent::date));
  else
    v_days := public.app_setting_int('quote_lapse_days', 90);
  end if;
  return v_clock + v_days;
end;
$$;

create or replace function public.quote_has_unverified_or_any_proof(p_quote_id uuid)
returns boolean language sql stable set search_path = public as $$
  select exists (
    select 1 from public.documents d
     where d.related_quote_id = p_quote_id
       and d.category = 'proof_of_payment'
  );
$$;

-- Mirrors reserveQuotedDogs.ts: never touch sold / deceased; never steal a
-- reservation that belongs to another live quote or a live invoice.
create or replace function public.release_dogs_from_lapsed_quote(p_quote_id uuid)
returns table(dog_id uuid, dog_name text)
language plpgsql security definer set search_path = public as $$
declare
  r record;
  v_number text;
  v_claimed boolean;
begin
  select quote_number into v_number from public.quotes where id = p_quote_id;
  for r in
    select qi.dog_id, d.name, d.status
      from public.quote_items qi
      join public.dogs d on d.id = qi.dog_id
     where qi.quote_id = p_quote_id
       and qi.subject_kind = 'dog'
       and qi.dog_id is not null
  loop
    if r.status is distinct from 'reserved' then continue; end if;
    v_claimed := exists (
      select 1 from public.quote_items oqi
      join public.quotes oq on oq.id = oqi.quote_id
     where oqi.dog_id = r.dog_id and oqi.subject_kind = 'dog'
       and oq.id <> p_quote_id and oq.status in ('draft', 'sent', 'accepted')
    ) or exists (
      select 1 from public.invoices i
      join public.quote_items iqi on iqi.quote_id = i.quote_id
     where iqi.dog_id = r.dog_id and iqi.subject_kind = 'dog'
       and i.status not in ('void', 'cancelled', 'draft')
       and i.quote_id is distinct from p_quote_id
    );
    if v_claimed then continue; end if;
    update public.dogs set status = 'available', updated_at = now()
     where id = r.dog_id and status = 'reserved';
    if not found then continue; end if;
    insert into public.audit_log (table_name, record_id, action, actor_role, new_values)
    values (
      'dogs', r.dog_id::text, 'update', 'system',
      jsonb_build_object('event', 'quote_lapse_release', 'quote_number', v_number,
                         'from_status', 'reserved', 'to_status', 'available')
    );
    dog_id := r.dog_id;
    dog_name := coalesce(r.name, r.dog_id::text);
    return next;
  end loop;
end;
$$;

create or replace function public.quote_lapse_send_email(p_to text, p_subject text, p_html text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_url text;
  v_key text;
begin
  if coalesce(p_to, '') = '' then return; end if;
  if coalesce(current_setting('app.quote_lapse_skip_email', true), '') = 'true' then return; end if;
  v_url := current_setting('app.settings.supabase_url', true);
  v_key := current_setting('app.settings.service_role_key', true);
  if v_url is null or v_key is null then
    begin
      select decrypted_secret into v_url from vault.decrypted_secrets where name = 'supabase_url' limit 1;
      select decrypted_secret into v_key from vault.decrypted_secrets where name = 'service_role_key' limit 1;
    exception when others then null;
    end;
  end if;
  if v_url is null or v_key is null then
    begin
      select value into v_url from private.app_config where key = 'edge_base_url';
      select value into v_key from private.app_config where key = 'service_role_key';
    exception when others then null;
    end;
  end if;
  v_url := coalesce(nullif(v_url, ''), 'https://nlmwxodvquwbjinhhbmr.supabase.co');
  if coalesce(v_key, '') = '' then
    raise notice 'quote lapse: no service role key — email not sent';
    return;
  end if;
  perform net.http_post(
    url := rtrim(v_url, '/') || '/functions/v1/send-email',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_key),
    body := jsonb_build_object('to', p_to, 'subject', p_subject, 'html', p_html)
  );
exception when others then
  raise notice 'quote_lapse_send_email: %', sqlerrm;
end;
$$;

create or replace function public.stamp_quote_client_activity(p_quote_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_client uuid; v_app uuid;
begin
  select client_id, application_id into v_client, v_app from public.quotes where id = p_quote_id;
  if not found then return; end if;
  if auth.uid() is null then return; end if;
  if v_client is distinct from auth.uid()
     and not exists (select 1 from public.applications a where a.id = v_app and a.user_id = auth.uid())
     and not public.is_admin() then
    return;
  end if;
  update public.quotes
     set last_client_activity_at = now(), updated_at = now()
   where id = p_quote_id and status in ('sent', 'accepted');
end;
$$;
grant execute on function public.stamp_quote_client_activity(uuid) to authenticated, service_role;

create or replace function public.trg_quote_activity_on_accept()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.accepted_at is not null and old.accepted_at is null then
    new.last_client_activity_at := coalesce(new.last_client_activity_at, now());
  end if;
  return new;
end;
$$;
drop trigger if exists trg_quote_activity_on_accept on public.quotes;
create trigger trg_quote_activity_on_accept
  before update on public.quotes for each row
  execute function public.trg_quote_activity_on_accept();

create or replace function public.trg_quote_activity_on_proof()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.category = 'proof_of_payment' and new.related_quote_id is not null then
    update public.quotes
       set last_client_activity_at = now(), updated_at = now()
     where id = new.related_quote_id and status in ('sent', 'accepted');
  end if;
  return new;
end;
$$;
drop trigger if exists trg_quote_activity_on_proof on public.documents;
create trigger trg_quote_activity_on_proof
  after insert on public.documents for each row
  execute function public.trg_quote_activity_on_proof();

-- does not ask for marketing consent — agreed_to_terms is consent to the
-- terms of an application, not permission to market. Under POPIA, treating
-- a lapsed enquiry as marketing consent because they once filled in a form
-- is exactly the inference the Act does not allow. They land as a record,
-- not a mailing-list member. campaigns / campaign_recipients keep filtering
-- on marketing_opt_in = true. The newsletter opt-in is the lawful route.
create or replace function public.lapse_one_quote(p_quote_id uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare
  q public.quotes%rowtype;
  v_dogs text := '';
  v_name text;
  r record;
  wl public.waiting_list%rowtype;
  v_reason text;
begin
  select * into q from public.quotes where id = p_quote_id for update;
  if not found or q.status is distinct from 'sent' then return ''; end if;

  v_reason := 'Quote ' || coalesce(q.quote_number, p_quote_id::text)
    || ' lapsed after the validity printed on the document, with no payment and no reply.';

  update public.quotes
     set status = 'expired', lapsed_at = now(), lapse_reason = v_reason, updated_at = now()
   where id = p_quote_id and status = 'sent';

  for r in select * from public.release_dogs_from_lapsed_quote(p_quote_id) loop
    v_dogs := v_dogs || case when v_dogs = '' then '' else ', ' end || coalesce(r.dog_name, r.dog_id::text);
  end loop;

  if q.application_id is not null then
    update public.applications
       set status = 'approved',
           admin_notes = concat_ws(E'\n\n', nullif(btrim(coalesce(admin_notes, '')), ''), v_reason),
           updated_at = now()
     where id = q.application_id;
  end if;

  for wl in select * from public.waiting_list where quote_id = p_quote_id loop
    if not public.waiting_list_row_has_payment(wl) then
      delete from public.waiting_list where id = wl.id;
    end if;
  end loop;

  if q.contact_id is not null then
    select full_name into v_name from public.contacts where id = q.contact_id;
    update public.contacts
       set contact_type = 'prospect',
           tags = (select coalesce(array_agg(distinct x), '{}')
                     from unnest(coalesce(tags, '{}') || array['lapsed-quote']) x),
           source_ref = case
             when source_ref is not null then source_ref
             when exists (select 1 from public.contacts c2
                           where c2.source_ref = q.quote_number and c2.id <> q.contact_id)
               then source_ref
             else q.quote_number
           end,
           updated_at = now()
     where id = q.contact_id;
    -- marketing_opt_in is intentionally not written. See comment above.
  end if;

  return coalesce(nullif(v_dogs, ''), '(no puppy released)');
end;
$$;

create or replace function public.process_quote_lapse_ladder()
returns table(action text, quote_id uuid, quote_number text, detail text)
language plpgsql security definer set search_path = public as $$
declare
  q record;
  v_clock timestamptz;
  v_due date;
  v_first int := public.app_setting_int('quote_reminder_first_days', 30);
  v_final int := public.app_setting_int('quote_reminder_final_days', 60);
  v_email text;
  v_name text;
  v_opt_out timestamptz;
  v_html text;
  v_released text;
  v_lapse_date text;
  v_digest text := '';
  v_uid uuid;
  v_admin_email text;
  v_site text := 'https://diedericksdobermanns.com';
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Not authorised' using errcode = '42501';
  end if;
  if not public.quote_lapse_enabled() then return; end if;

  for q in
    select qu.*, c.email as contact_email, c.full_name as contact_name,
           c.marketing_opt_out_at, c.user_id as contact_user_id,
           a.email as app_email, a.full_name as app_name,
           u.full_name as client_name
      from public.quotes qu
      left join public.contacts c on c.id = qu.contact_id
      left join public.applications a on a.id = qu.application_id
      left join public.users u on u.id = qu.client_id
     where qu.status = 'sent'
       and qu.sent_at is not null
       and qu.lapsed_at is null
     order by qu.sent_at
  loop
    if q.lapse_hold_until is not null and q.lapse_hold_until >= current_date then
      continue;
    end if;
    if q.converted_invoice_id is not null then continue; end if;
    if public.client_has_payment(q.client_id, q.contact_id) then continue; end if;
    if public.quote_has_unverified_or_any_proof(q.id) then continue; end if;

    v_clock := public.quote_lapse_clock(q.sent_at, q.last_client_activity_at);
    v_due := public.quote_lapse_due_date(q.sent_at, q.last_client_activity_at, q.valid_until);
    v_email := coalesce(nullif(btrim(q.contact_email), ''), nullif(btrim(q.app_email), ''));
    v_name := coalesce(nullif(btrim(q.contact_name), ''), nullif(btrim(q.app_name), ''), nullif(btrim(q.client_name), ''), 'there');
    v_opt_out := q.marketing_opt_out_at;
    v_lapse_date := to_char(v_due, 'DD Mon YYYY');
    v_uid := coalesce(q.contact_user_id, q.client_id);

    if v_due <= current_date then
      v_released := public.lapse_one_quote(q.id);
      action := 'lapsed'; quote_id := q.id; quote_number := q.quote_number;
      detail := v_released;
      v_digest := v_digest || '<li><strong>' || coalesce(q.quote_number, '') || '</strong> — '
        || v_name || ' — puppy: ' || v_released || '</li>';
      return next;
      continue;
    end if;

    v_html := '<div style="font-family:Georgia,serif;background:#111008;color:#F5F0E8;padding:24px">'
      || '<p>Dear ' || replace(v_name, '<', '') || ',</p>';

    if v_clock + make_interval(days => v_final) <= now() then
      if q.reminder_final_sent_at is not null then continue; end if;
      update public.quotes set reminder_final_sent_at = now(),
             reminder_first_sent_at = coalesce(reminder_first_sent_at, now()), updated_at = now()
       where id = q.id and reminder_final_sent_at is null;
      if not found then continue; end if;
      if v_opt_out is null and v_email is not null then
        perform public.quote_lapse_send_email(v_email,
          'Your quotation lapses on ' || v_lapse_date,
          v_html || '<p>This is the last note on this one. Your quotation lapses on <strong>'
          || v_lapse_date || '</strong> and the puppy goes back to the available list. If you still want him, a deposit keeps him.</p>'
          || '<p><a href="' || v_site || '/portal/quotes/' || q.id || '" style="color:#C4A35A">Open your quotation →</a></p></div>');
        insert into public.notifications_log (recipient_id, type, subject, body, status)
        values (v_uid, 'quote_reminder_final', 'Your quotation lapses on ' || v_lapse_date, q.quote_number, 'sent');
      end if;
      action := 'final_notice'; quote_id := q.id; quote_number := q.quote_number;
      detail := v_lapse_date;
      return next;
      continue;
    end if;

    if v_clock + make_interval(days => v_first) <= now() then
      if q.reminder_first_sent_at is not null then continue; end if;
      update public.quotes set reminder_first_sent_at = now(), updated_at = now()
       where id = q.id and reminder_first_sent_at is null;
      if not found then continue; end if;
      if v_opt_out is null and v_email is not null then
        perform public.quote_lapse_send_email(v_email,
          'Your quotation is still open',
          v_html || '<p>Your quotation is still open. Your place is held until we hear from you, and a deposit is what secures it. If anything has changed, tell me and I will hold it or release it — no hard feelings either way.</p>'
          || '<p><a href="' || v_site || '/portal/quotes/' || q.id || '" style="color:#C4A35A">Open your quotation →</a></p></div>');
        insert into public.notifications_log (recipient_id, type, subject, body, status)
        values (v_uid, 'quote_reminder_first', 'Your quotation is still open', q.quote_number, 'sent');
      end if;
      action := 'first_reminder'; quote_id := q.id; quote_number := q.quote_number;
      detail := 'first';
      return next;
    end if;
  end loop;

  if v_digest <> '' then
    v_html := '<div style="font-family:Georgia,serif;background:#111008;color:#F5F0E8;padding:24px">'
      || '<h2 style="color:#C4A35A;font-size:14px;letter-spacing:0.08em;text-transform:uppercase">Quotes lapsed this morning</h2>'
      || '<ul>' || v_digest || '</ul>'
      || '<p><a href="' || v_site || '/admin/quotes" style="color:#C4A35A">Open quotes →</a></p></div>';
    for v_uid, v_admin_email in
      select p.id, au.email from public.users p
      join auth.users au on au.id = p.id
      where p.role in ('admin', 'super_admin') and au.email is not null
    loop
      insert into public.notifications_log (recipient_id, type, subject, body, status)
      values (v_uid, 'quote_lapsed', 'Quotes lapsed this morning', 'See email digest.', 'sent');
      perform public.quote_lapse_send_email(v_admin_email, 'Quotes lapsed this morning', v_html);
    end loop;
  end if;
end;
$$;

revoke all on function public.process_quote_lapse_ladder() from public, anon, authenticated;
revoke all on function public.release_dogs_from_lapsed_quote(uuid) from public, anon, authenticated;
revoke all on function public.lapse_one_quote(uuid) from public, anon, authenticated;
grant execute on function public.process_quote_lapse_ladder() to service_role, authenticated;
grant execute on function public.release_dogs_from_lapsed_quote(uuid) to service_role;
grant execute on function public.lapse_one_quote(uuid) to service_role;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'process-quote-lapse-ladder-daily') then
      perform cron.unschedule('process-quote-lapse-ladder-daily');
    end if;
    perform cron.schedule(
      'process-quote-lapse-ladder-daily',
      '45 7 * * *',
      $cron$ select public.process_quote_lapse_ladder(); $cron$
    );
  end if;
exception when others then
  raise notice 'Could not schedule process-quote-lapse-ladder-daily (%). Use Dashboard Cron.', sqlerrm;
end $$;
