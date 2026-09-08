-- 0160 — One application, more than one dog.
-- A second dog is a request line on the existing application, never a second
-- application. queue_anchor_at is ordered from applications.created_at so
-- allocating dog one cannot move dog two backwards.
--
-- Do not apply to the live database from this prompt. Matt applies it.

-- 1a. applications.dogs_requested -------------------------------------------
alter table public.applications
  add column if not exists dogs_requested smallint not null default 1;

alter table public.applications
  drop constraint if exists applications_dogs_requested_range;
alter table public.applications
  add constraint applications_dogs_requested_range
  check (dogs_requested between 1 and 4);

-- 1b. application_dog_requests ----------------------------------------------
create table if not exists public.application_dog_requests (
  id                 uuid primary key default gen_random_uuid(),
  application_id     uuid not null references public.applications(id) on delete cascade,
  request_index      smallint not null,
  preferred_sex      text,
  preferred_colour   text,
  ear_preference     text,
  tail_preference    text,
  preferred_category text,
  preferred_timeline text,
  budget_range       text,
  notes              text,
  created_at         timestamptz not null default now(),
  unique (application_id, request_index)
);

alter table public.application_dog_requests enable row level security;

drop policy if exists "Applicants read own dog requests" on public.application_dog_requests;
create policy "Applicants read own dog requests"
on public.application_dog_requests for select
using (exists (select 1 from public.applications a
               where a.id = application_dog_requests.application_id
                 and a.user_id = auth.uid()));

drop policy if exists "Admins manage dog requests" on public.application_dog_requests;
create policy "Admins manage dog requests"
on public.application_dog_requests for all
using ((select public.is_admin())) with check ((select public.is_admin()));

grant select on public.application_dog_requests to anon, authenticated;
grant insert, update, delete on public.application_dog_requests to authenticated;

insert into public.application_dog_requests
  (application_id, request_index, preferred_sex, preferred_colour, tail_preference,
   preferred_timeline, budget_range)
select id, 1, preferred_sex, preferred_colour, tail_preference,
       preferred_timeline, budget_range
from public.applications
on conflict (application_id, request_index) do nothing;

-- Request 1 is copied from the application row so a public insert-only
-- applicant (no SELECT on applications) still gets a child row.
create or replace function public.trg_application_seed_dog_request_1()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.application_dog_requests
    (application_id, request_index, preferred_sex, preferred_colour, tail_preference,
     preferred_timeline, budget_range)
  values (
    new.id, 1, new.preferred_sex, new.preferred_colour, new.tail_preference,
    new.preferred_timeline, new.budget_range
  )
  on conflict (application_id, request_index) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_application_seed_dog_request_1 on public.applications;
create trigger trg_application_seed_dog_request_1
  after insert on public.applications
  for each row
  execute function public.trg_application_seed_dog_request_1();

-- Public apply cannot INSERT child rows (exactly two RLS policies, no insert
-- policy for applicants). SECURITY DEFINER writes the 1–4 preference sets.
create or replace function public.save_application_dog_requests(
  p_application_id uuid,
  p_requests jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app public.applications%rowtype;
  v_item jsonb;
  v_idx smallint := 0;
  v_count smallint;
begin
  if p_application_id is null then
    raise exception 'Application is required' using errcode = '22023';
  end if;
  select * into v_app from public.applications where id = p_application_id;
  if not found then
    raise exception 'Application not found' using errcode = 'P0002';
  end if;
  if not public.is_admin() then
    if v_app.created_at < now() - interval '2 hours' then
      raise exception 'Not authorised' using errcode = '42501';
    end if;
    -- An anonymous caller may only touch an application that has no login yet.
    -- Once it belongs to a user, only that user or an admin may write to it.
    -- Without this, auth.uid() being null skipped the whole check and any
    -- holder of a <2h-old application UUID could rewrite its preferences.
    if auth.uid() is null then
      if v_app.user_id is not null then
        raise exception 'Not authorised' using errcode = '42501';
      end if;
    elsif v_app.user_id is not null
          and v_app.user_id is distinct from auth.uid() then
      raise exception 'Not authorised' using errcode = '42501';
    end if;
  end if;

  if p_requests is null or jsonb_typeof(p_requests) is distinct from 'array' then
    raise exception 'Requests must be a JSON array' using errcode = '22023';
  end if;
  v_count := jsonb_array_length(p_requests);
  if v_count < 1 or v_count > 4 then
    raise exception 'dogs_requested must be between 1 and 4' using errcode = '22023';
  end if;

  delete from public.application_dog_requests
   where application_id = p_application_id
     and request_index > v_count;

  for v_item in select * from jsonb_array_elements(p_requests)
  loop
    v_idx := v_idx + 1;
    insert into public.application_dog_requests (
      application_id, request_index, preferred_sex, preferred_colour,
      ear_preference, tail_preference, preferred_category, preferred_timeline,
      budget_range, notes
    ) values (
      p_application_id, v_idx,
      nullif(v_item->>'preferred_sex', ''),
      nullif(v_item->>'preferred_colour', ''),
      nullif(v_item->>'ear_preference', ''),
      nullif(v_item->>'tail_preference', ''),
      nullif(v_item->>'preferred_category', ''),
      nullif(v_item->>'preferred_timeline', ''),
      nullif(v_item->>'budget_range', ''),
      nullif(v_item->>'notes', '')
    )
    on conflict (application_id, request_index) do update set
      preferred_sex = excluded.preferred_sex,
      preferred_colour = excluded.preferred_colour,
      ear_preference = excluded.ear_preference,
      tail_preference = excluded.tail_preference,
      preferred_category = excluded.preferred_category,
      preferred_timeline = excluded.preferred_timeline,
      budget_range = excluded.budget_range,
      notes = excluded.notes;
  end loop;

  update public.applications
     set dogs_requested = v_count,
         preferred_sex = coalesce(p_requests->0->>'preferred_sex', preferred_sex),
         preferred_colour = coalesce(p_requests->0->>'preferred_colour', preferred_colour),
         tail_preference = coalesce(p_requests->0->>'tail_preference', tail_preference),
         preferred_timeline = coalesce(p_requests->0->>'preferred_timeline', preferred_timeline),
         budget_range = coalesce(p_requests->0->>'budget_range', budget_range)
   where id = p_application_id;
end;
$$;

revoke all on function public.save_application_dog_requests(uuid, jsonb) from public;
grant execute on function public.save_application_dog_requests(uuid, jsonb)
  to anon, authenticated, service_role;

-- 1c. waiting_list — standing vs allocation ---------------------------------
alter table public.waiting_list
  add column if not exists request_index    smallint     not null default 1,
  add column if not exists sibling_group_id uuid,
  add column if not exists queue_anchor_at  timestamptz;

update public.waiting_list w
   set queue_anchor_at = coalesce(
         (select a.created_at from public.applications a where a.id = w.application_id),
         w.date_added,
         w.created_at)
 where w.queue_anchor_at is null;

alter table public.waiting_list alter column queue_anchor_at set not null;

create index if not exists waiting_list_queue_anchor_idx
  on public.waiting_list (queue_anchor_at, request_index);

-- Manual inserts (admin enquiry) must still get an anchor; never use date_added.
create or replace function public.trg_waiting_list_set_queue_anchor()
returns trigger
language plpgsql
as $$
begin
  if new.queue_anchor_at is null then
    new.queue_anchor_at := coalesce(
      (select a.created_at from public.applications a where a.id = new.application_id),
      new.date_added,
      new.created_at,
      now()
    );
  end if;
  if new.sibling_group_id is null and new.application_id is not null then
    new.sibling_group_id := coalesce(
      (select w.sibling_group_id from public.waiting_list w
        where w.application_id = new.application_id
          and w.sibling_group_id is not null
        limit 1),
      gen_random_uuid()
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_waiting_list_set_queue_anchor on public.waiting_list;
create trigger trg_waiting_list_set_queue_anchor
  before insert on public.waiting_list
  for each row
  execute function public.trg_waiting_list_set_queue_anchor();

-- One sibling_group per application that already has waitlist rows.
update public.waiting_list w
   set sibling_group_id = coalesce(
         sibling_group_id,
         (select w2.id from public.waiting_list w2
           where w2.application_id = w.application_id
           order by w2.id
           limit 1))
 where w.application_id is not null
   and w.sibling_group_id is null;

-- Quote lapse: never lapse a multi-dog quote while a sibling is paid/reserved,
-- and never cascade into a paid sibling.
create or replace function public.quote_has_paid_or_reserved_sibling(p_quote_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.waiting_list w
      join public.waiting_list sib
        on sib.sibling_group_id is not null
       and sib.sibling_group_id = w.sibling_group_id
     where w.quote_id = p_quote_id
       and sib.pipeline_stage in ('deposit_paid', 'reserved')
  ) or exists (
    select 1 from public.waiting_list w
     where w.quote_id = p_quote_id
       and w.pipeline_stage in ('deposit_paid', 'reserved')
  );
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

revoke all on function public.process_quote_lapse_ladder() from public, anon;
grant execute on function public.process_quote_lapse_ladder() to service_role, authenticated;

-- lapse_one_quote must not delete a paid/reserved sibling line.
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
  if public.quote_has_paid_or_reserved_sibling(p_quote_id) then
    return '(held — sibling deposit paid or reserved)';
  end if;

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
    if wl.pipeline_stage in ('deposit_paid', 'reserved') then
      continue;
    end if;
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
  end if;

  return coalesce(nullif(v_dogs, ''), '(no puppy released)');
end;
$$;

revoke all on function public.lapse_one_quote(uuid) from public, anon, authenticated;
grant execute on function public.lapse_one_quote(uuid) to service_role;

-- Seed one waitlist line per dog request. Paid invoice attaches to one line only.
create or replace function public.ensure_waitlist_lines_for_application(
  p_application_id uuid,
  p_invoice_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app public.applications%rowtype;
  v_list_type uuid;
  v_quote uuid;
  v_group uuid;
  v_anchor timestamptz;
  v_req record;
  v_existing uuid;
  v_colour text;
  v_paid_line uuid;
begin
  select * into v_app from public.applications where id = p_application_id;
  if not found then return; end if;

  select id into v_list_type from public.waiting_list_types order by sort_order limit 1;
  if p_invoice_id is not null then
    select i.quote_id into v_quote from public.invoices i where i.id = p_invoice_id;
  end if;
  if v_quote is null then
    select q.id into v_quote from public.quotes q
     where q.application_id = v_app.id
     order by q.created_at desc limit 1;
  end if;

  select sibling_group_id, queue_anchor_at
    into v_group, v_anchor
    from public.waiting_list
   where application_id = v_app.id
   order by request_index
   limit 1;

  v_group := coalesce(v_group, gen_random_uuid());
  v_anchor := coalesce(v_anchor, v_app.created_at, now());

  if not exists (
    select 1 from public.application_dog_requests r where r.application_id = v_app.id
  ) then
    insert into public.application_dog_requests
      (application_id, request_index, preferred_sex, preferred_colour, tail_preference,
       preferred_timeline, budget_range)
    values (v_app.id, 1, v_app.preferred_sex, v_app.preferred_colour, v_app.tail_preference,
            v_app.preferred_timeline, v_app.budget_range)
    on conflict (application_id, request_index) do nothing;
  end if;

  for v_req in
    select * from public.application_dog_requests
     where application_id = v_app.id
     order by request_index
  loop
    select id into v_existing
      from public.waiting_list
     where application_id = v_app.id and request_index = v_req.request_index
     limit 1;
    if v_existing is not null then
      update public.waiting_list
         set sibling_group_id = coalesce(sibling_group_id, v_group),
             queue_anchor_at = coalesce(queue_anchor_at, v_anchor)
       where id = v_existing;
      continue;
    end if;

    v_colour := case
      when v_req.preferred_colour in ('black_tan', 'brown_tan', 'no_preference') then v_req.preferred_colour
      when v_app.preferred_colour in ('black_tan', 'brown_tan', 'no_preference') then v_app.preferred_colour
      else 'no_preference'
    end;

    insert into public.waiting_list (
      list_type_id, pipeline_stage, stage_updated_at, stage_updated_by,
      client_id, application_id, quote_id,
      enquirer_name, enquirer_email, enquirer_phone, enquirer_country,
      source, preferred_category, preferred_sex, preferred_colour, tail_preference,
      budget_range, preferred_timeline, preference_notes,
      priority, status, payment_status,
      request_index, sibling_group_id, queue_anchor_at,
      stage_change_note
    ) values (
      v_list_type,
      'approved',
      now(),
      auth.uid(),
      v_app.user_id,
      v_app.id,
      v_quote,
      v_app.full_name,
      v_app.email,
      v_app.phone,
      v_app.country,
      'app',
      coalesce(v_req.preferred_category, public.category_from_dog_interest(v_app.dog_interest)),
      coalesce(v_req.preferred_sex, v_app.preferred_sex, 'any'),
      v_colour,
      coalesce(v_req.tail_preference, v_app.tail_preference, 'no_preference'),
      coalesce(v_req.budget_range, v_app.budget_range),
      coalesce(v_req.preferred_timeline, v_app.preferred_timeline),
      coalesce(v_req.notes, v_app.special_requests, v_app.why_dobermann),
      'normal',
      'active',
      'not_paid',
      v_req.request_index,
      v_group,
      v_anchor,
      'Multi-dog request line'
    );
  end loop;

  if p_invoice_id is not null then
    select id into v_paid_line
      from public.waiting_list
     where application_id = v_app.id
       and deposit_invoice_id is null
     order by request_index
     limit 1;
    if v_paid_line is not null then
      update public.waiting_list
         set pipeline_stage = 'deposit_paid',
             payment_status = 'deposit_paid',
             deposit_invoice_id = p_invoice_id,
             deposit_paid_date = current_date,
             quote_id = coalesce(quote_id, v_quote),
             sibling_group_id = v_group,
             queue_anchor_at = v_anchor,
             stage_updated_at = now(),
             stage_change_note = 'Payment recorded'
       where id = v_paid_line;
    end if;
  end if;
end;
$$;

revoke all on function public.ensure_waitlist_lines_for_application(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.ensure_waitlist_lines_for_application(uuid, uuid)
  to service_role;

create or replace function public.promote_waitlist_on_payment(
  p_client_id uuid,
  p_contact_id uuid,
  p_invoice_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_ids uuid[] := '{}';
  v_emails text[] := '{}';
  v_app public.applications%rowtype;
  v_quote_id uuid;
begin
  if p_client_id is not null then
    v_client_ids := array_append(v_client_ids, p_client_id);
  end if;
  if p_contact_id is not null then
    v_client_ids := v_client_ids || array(
      select c.user_id from public.contacts c
      where c.id = p_contact_id and c.user_id is not null
    );
    v_emails := v_emails || array(
      select lower(btrim(c.email)) from public.contacts c
      where c.id = p_contact_id and c.email is not null
    );
  end if;
  if p_client_id is not null then
    v_emails := v_emails || array(
      select lower(btrim(u.email)) from public.users u
      where u.id = p_client_id and u.email is not null
    );
    v_emails := v_emails || array(
      select lower(btrim(c.email)) from public.contacts c
      where c.user_id = p_client_id and c.email is not null
    );
  end if;

  v_client_ids := (select coalesce(array_agg(distinct x), '{}') from unnest(v_client_ids) x where x is not null);
  v_emails := (select coalesce(array_agg(distinct x), '{}') from unnest(v_emails) x where x is not null and x <> '');

  if p_invoice_id is not null then
    select i.quote_id into v_quote_id from public.invoices i where i.id = p_invoice_id;
  end if;

  for v_app in
    select a.*
      from public.applications a
     where a.status in ('approved', 'waitlisted')
       and a.archived_at is null
       and (
         (cardinality(v_client_ids) > 0 and a.user_id = any (v_client_ids))
         or (cardinality(v_emails) > 0 and lower(btrim(a.email)) = any (v_emails))
         or (v_quote_id is not null and exists (
              select 1 from public.quotes q
              where q.id = v_quote_id and q.application_id = a.id
            ))
       )
  loop
    perform public.ensure_waitlist_lines_for_application(v_app.id, p_invoice_id);
    update public.applications
       set status = 'waitlisted'
     where id = v_app.id
       and status = 'approved';
  end loop;
end;
$$;

-- Admin / portal: add another dog to this application (never a second application).
create or replace function public.add_dog_to_application(
  p_application_id uuid,
  p_prefs jsonb default '{}'::jsonb
)
returns smallint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_app public.applications%rowtype;
  v_next smallint;
begin
  select * into v_app from public.applications where id = p_application_id;
  if not found then
    raise exception 'Application not found' using errcode = 'P0002';
  end if;
  if not public.is_admin()
     and (auth.uid() is null or v_app.user_id is distinct from auth.uid()) then
    raise exception 'Not authorised' using errcode = '42501';
  end if;

  select coalesce(max(request_index), 0) + 1 into v_next
    from public.application_dog_requests
   where application_id = p_application_id;
  if v_next > 4 then
    raise exception 'A maximum of 4 dogs can be requested on one application' using errcode = '22023';
  end if;

  insert into public.application_dog_requests (
    application_id, request_index, preferred_sex, preferred_colour,
    ear_preference, tail_preference, preferred_category, preferred_timeline,
    budget_range, notes
  ) values (
    p_application_id, v_next,
    nullif(p_prefs->>'preferred_sex', ''),
    nullif(p_prefs->>'preferred_colour', ''),
    nullif(p_prefs->>'ear_preference', ''),
    nullif(p_prefs->>'tail_preference', ''),
    nullif(p_prefs->>'preferred_category', ''),
    nullif(p_prefs->>'preferred_timeline', ''),
    nullif(p_prefs->>'budget_range', ''),
    nullif(p_prefs->>'notes', '')
  );

  update public.applications
     set dogs_requested = v_next
   where id = p_application_id;

  if exists (select 1 from public.waiting_list where application_id = p_application_id) then
    perform public.ensure_waitlist_lines_for_application(p_application_id, null);
  end if;

  return v_next;
end;
$$;

revoke all on function public.add_dog_to_application(uuid, jsonb) from public;
grant execute on function public.add_dog_to_application(uuid, jsonb)
  to authenticated, service_role;
