-- 0164 — First-reminder copy: a deposit holds the place, an unpaid quote does not.
-- Replaces process_quote_lapse_ladder() as left by 0160. Same function,
-- corrected paragraph only. Do not call it from this migration — it sends mail.

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
    -- Multi-dog: do not lapse while any sibling line is deposit_paid or reserved.
    if public.quote_has_paid_or_reserved_sibling(q.id) then continue; end if;

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
          v_html || '<p>Your quotation is still open and we are in no hurry. A deposit is what holds your place on the waiting list and secures the puppy — until then he stays on the available list. If anything has changed, just tell me and I will hold him for you or release him — no hard feelings either way.</p>'
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

revoke all on function public.process_quote_lapse_ladder() from public, anon;
grant execute on function public.process_quote_lapse_ladder() to service_role, authenticated;
