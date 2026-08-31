-- Owner photo cadence: 3 photos per 4-month window, RLS-enforced.
-- Death report vet docs (admin-only). Condolence check-in draft (never auto-sent).
-- Prefer derived window from dog_media — no dog_photo_windows table.

-- ---------------------------------------------------------------------------
-- Go-home anchor for the first window
-- ---------------------------------------------------------------------------
create or replace function public.dog_go_home_date(p_dog_id uuid)
returns date
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    d.handover_date,
    l.go_home_date,
    d.ownership_status_at,
    d.created_at::date
  )
  from public.dogs d
  left join public.litters l on l.id = d.litter_id
  where d.id = p_dog_id;
$$;

-- Owner-uploaded photo rows (client role), newest first helper via subquery.
create or replace function public.owner_photo_window(p_dog_id uuid)
returns table (
  window_open_at timestamptz,
  photos_in_window int,
  can_upload boolean,
  next_window_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_go date;
  v_open timestamptz;
  v_last timestamptz;
  v_count int;
begin
  v_go := public.dog_go_home_date(p_dog_id);
  if v_go is null then
    window_open_at := null;
    photos_in_window := 0;
    can_upload := false;
    next_window_at := null;
    return next;
  end if;

  -- First window opens four months after go-home. Each later window opens
  -- four months after the last owner photo in the previous window.
  v_open := (v_go + interval '4 months')::timestamptz;

  loop
    select count(*)::int, max(m.uploaded_at)
      into v_count, v_last
      from public.dog_media m
      join public.users u on u.id = m.uploaded_by
     where m.dog_id = p_dog_id
       and m.uploaded_by is not null
       and u.role = 'client'
       and m.uploaded_at >= v_open;

    exit when coalesce(v_count, 0) = 0;
    exit when now() < v_last + interval '4 months';
    v_open := v_last + interval '4 months';
  end loop;

  window_open_at := v_open;
  photos_in_window := coalesce(v_count, 0);
  can_upload := (now() >= v_open) and coalesce(v_count, 0) < 3;
  next_window_at := case
    when coalesce(v_count, 0) > 0 then v_last + interval '4 months'
    else v_open
  end;
  return next;
end;
$$;

grant execute on function public.dog_go_home_date(uuid) to authenticated, service_role;
grant execute on function public.owner_photo_window(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Force private landing for owner inserts (belt + braces with WITH CHECK)
-- ---------------------------------------------------------------------------
create or replace function public.trg_dog_media_owner_force_private()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
begin
  select role into v_role from public.users where id = auth.uid();
  if v_role = 'client' then
    new.is_public := false;
    new.client_consent := false;
    new.approved_by := null;
    new.approved_at := null;
    if new.uploaded_by is null then
      new.uploaded_by := auth.uid();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_dog_media_owner_force_private on public.dog_media;
create trigger trg_dog_media_owner_force_private
  before insert on public.dog_media
  for each row execute function public.trg_dog_media_owner_force_private();

-- ---------------------------------------------------------------------------
-- Owner insert: own dog only, window open, under the 3-photo cap
-- ---------------------------------------------------------------------------
drop policy if exists "Owners can insert own dog media" on public.dog_media;
create policy "Owners can insert own dog media" on public.dog_media
  for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and is_public = false
    and client_consent = false
    and approved_by is null
    and approved_at is null
    and dog_id in (select public.dog_ids_for(auth.uid()))
    and exists (
      select 1 from public.owner_photo_window(dog_id) w
      where w.can_upload = true
        and w.photos_in_window < 3
    )
  );

-- ---------------------------------------------------------------------------
-- notifications_log — owner photo reminder + death report alert
-- ---------------------------------------------------------------------------
alter table public.notifications_log
  drop constraint if exists notifications_log_type_check;

alter table public.notifications_log
  add constraint notifications_log_type_check
  check (type = any (array[
    'push'::text,
    'email'::text,
    'whatsapp'::text,
    'application_confirmation'::text,
    'document_expiry'::text,
    'application_received'::text,
    'application_reminder'::text,
    'new_application'::text,
    'application_info_requested'::text,
    'application_approved'::text,
    'application_rejected'::text,
    'quote_sent'::text,
    'quote_accepted'::text,
    'quote_declined'::text,
    'payment_proof_uploaded'::text,
    'payment_proof_rejected'::text,
    'training_request'::text,
    'dog_birthday'::text,
    'issue_reported'::text,
    'issue_captured'::text,
    'dog_shared'::text,
    'handover_pack_sent'::text,
    'owner_photo_reminder'::text,
    'dog_deceased_reported'::text
  ]));

-- ---------------------------------------------------------------------------
-- Condolence drafts live on check_ins (manual send only)
-- ---------------------------------------------------------------------------
alter table public.check_ins drop constraint if exists check_ins_kind_check;
alter table public.check_ins
  add constraint check_ins_kind_check
  check (kind in ('post_placement', 'birthday', 'health_milestone', 'manual', 'condolence'));

-- ---------------------------------------------------------------------------
-- Client may report death on their own dog (owner_health_reports)
-- ---------------------------------------------------------------------------
drop policy if exists "Client can report own dog deceased" on public.owner_health_reports;
create policy "Client can report own dog deceased" on public.owner_health_reports
  for insert to authenticated
  with check (
    overall = 'deceased'
    and dog_id in (select public.dog_ids_for(auth.uid()))
    and recorded_by = auth.uid()
  );

-- Strengthen deceased trigger: status + deceased_at + condolence draft
create or replace function public.trg_owner_health_report_deceased()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_dog record;
  v_contact_id uuid;
  v_first text;
  v_draft text;
begin
  if new.overall = 'deceased' or new.died_at is not null then
    update public.dogs
       set ownership_status = 'deceased',
           ownership_status_at = coalesce(new.died_at, new.reported_at, current_date),
           status = 'deceased',
           deceased_at = coalesce(new.died_at, deceased_at, new.reported_at, current_date),
           deceased_cause = coalesce(nullif(new.cause_of_death, ''), deceased_cause)
     where id = new.dog_id;

    update public.check_ins
       set status = 'skipped',
           response_notes = trim(both from coalesce(response_notes, '')
             || case when coalesce(response_notes, '') = '' then '' else E'\n' end
             || '[auto] Cancelled — dog marked deceased'),
           updated_at = now()
     where dog_id = new.dog_id
       and status = 'due'
       and kind is distinct from 'condolence';

    select d.name, d.owner_id, d.buyer_contact_id
      into v_dog
      from public.dogs d where d.id = new.dog_id;

    v_contact_id := v_dog.buyer_contact_id;
    if v_contact_id is null and v_dog.owner_id is not null then
      select c.id into v_contact_id
        from public.contacts c
       where c.user_id = v_dog.owner_id
         and c.merged_into_contact_id is null
       limit 1;
    end if;

    select split_part(coalesce(c.full_name, u.full_name, 'there'), ' ', 1)
      into v_first
      from public.dogs d
      left join public.contacts c on c.id = v_contact_id
      left join public.users u on u.id = d.owner_id
     where d.id = new.dog_id;

    v_draft :=
      'Dear ' || coalesce(nullif(v_first, ''), 'there') || ',' || E'\n\n' ||
      'I was so sorry to hear about ' || coalesce(v_dog.name, 'your dog') ||
      '. Please know we are thinking of you.' || E'\n\n' ||
      'With sympathy,' || E'\n' || 'Matt';

    insert into public.check_ins (dog_id, contact_id, kind, due_date, draft_message, status)
    select new.dog_id, v_contact_id, 'condolence', current_date, v_draft, 'due'
     where not exists (
       select 1 from public.check_ins ci
        where ci.dog_id = new.dog_id and ci.kind = 'condolence' and ci.status = 'due'
     );
    -- Intentionally no email / no notifications_log send. Matt must press send.
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Vet report on death: entity_type=dog, admin-only (owner cannot read back)
-- ---------------------------------------------------------------------------
drop policy if exists "Client can insert death vet report" on public.documents;
create policy "Client can insert death vet report" on public.documents
  for insert to authenticated
  with check (
    entity_type = 'dog'
    and category = 'health_certificate'
    and provided_by = 'client'
    and is_public = false
    and client_visible = false
    and uploaded_by = auth.uid()
    and entity_id in (select public.dog_ids_for(auth.uid()))
  );
-- No SELECT policy for the uploading client — staff policies already cover admin read.
