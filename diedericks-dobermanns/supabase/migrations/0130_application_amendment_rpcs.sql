-- 0130 — Amendment RPCs and triggers. Depends on 0129.
-- reviewed_at / reviewed_by never move once stamped.

create or replace function public.applications_protect_reviewed_at()
returns trigger
language plpgsql
as $$
begin
  if old.reviewed_at is not null then
    new.reviewed_at := old.reviewed_at;
    new.reviewed_by := old.reviewed_by;
  end if;
  if old.id is distinct from new.id then
    raise exception 'FORBIDDEN_FIELD: id';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_applications_protect_reviewed_at on public.applications;
create trigger trg_applications_protect_reviewed_at
  before update on public.applications
  for each row
  execute procedure public.applications_protect_reviewed_at();

-- Stamp which version was approved. Re-approval keeps reviewed_at (trigger above).
create or replace function public.applications_stamp_approved_version()
returns trigger
language plpgsql
as $$
declare
  v int;
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    select coalesce(max(version_number), 1) into v
      from public.application_versions
     where application_id = new.id;
    new.approved_version_number := v;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_applications_stamp_approved_version on public.applications;
create trigger trg_applications_stamp_approved_version
  before update on public.applications
  for each row
  execute procedure public.applications_stamp_approved_version();

-- New applications get version 1 automatically.
create or replace function public.applications_insert_version_one()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.application_versions (
    application_id, version_number, snapshot, changed_by, changed_at, change_reason, tier_touched
  ) values (
    new.id, 1, to_jsonb(new), new.user_id, new.created_at, 'Initial snapshot', 'initial'
  );
  return new;
end;
$$;

drop trigger if exists trg_applications_insert_version_one on public.applications;
create trigger trg_applications_insert_version_one
  after insert on public.applications
  for each row
  execute procedure public.applications_insert_version_one();

-- Client amendment RPC — the only write path for an applicant.
create or replace function public.save_application_amendment(
  p_application_id uuid,
  p_patch jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.applications%rowtype;
  col text;
  tier text;
  next_n int;
  touched text := 'free';
  changed int := 0;
  new_val jsonb;
  old_val jsonb;
  uuid_cols text[] := array['specific_dog_id', 'litter_interest_id'];
begin
  if auth.uid() is null then
    raise exception 'NOT_SIGNED_IN';
  end if;
  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    raise exception 'INVALID_PATCH';
  end if;

  select * into rec from public.applications where id = p_application_id;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  if rec.archived_at is not null then
    raise exception 'ARCHIVED';
  end if;
  if rec.user_id is distinct from auth.uid() then
    raise exception 'NOT_OWNER';
  end if;

  old_val := to_jsonb(rec);

  for col in select jsonb_object_keys(p_patch)
  loop
    if col in (
      'id', 'user_id', 'status', 'reviewed_at', 'reviewed_by',
      'approved_version_number', 'admin_notes', 'created_at', 'updated_at',
      'archived_at', 'archived_by', 'archived_reason', 'reference_code',
      'reminder_count', 'last_reminder_sent_at', 'id_check_status', 'id_check_note'
    ) then
      raise exception 'FORBIDDEN_FIELD: %', col;
    end if;
    tier := public.application_field_tier(col);
    if tier is null then
      raise exception 'LOCKED_FIELD: %', col;
    end if;
    if tier = 'reapproval' then
      touched := 'reapproval';
    end if;

    new_val := p_patch -> col;
    if col = any (uuid_cols) and (new_val = '""'::jsonb or new_val = 'null'::jsonb) then
      new_val := 'null'::jsonb;
    end if;
    if (old_val -> col) is distinct from new_val then
      changed := changed + 1;
    end if;
  end loop;

  if changed = 0 then
    return jsonb_build_object(
      'ok', true,
      'status', rec.status,
      'version_number', (
        select coalesce(max(version_number), 1) from public.application_versions
         where application_id = rec.id
      ),
      'reviewed_at', rec.reviewed_at,
      'tier_touched', 'free',
      'unchanged', true
    );
  end if;

  update public.applications
     set
       phone = case when p_patch ? 'phone' then coalesce(nullif(p_patch->>'phone',''), phone) else phone end,
       email = case when p_patch ? 'email' then coalesce(nullif(p_patch->>'email',''), email) else email end,
       address = case when p_patch ? 'address' then nullif(p_patch->>'address','') else address end,
       city = case when p_patch ? 'city' then nullif(p_patch->>'city','') else city end,
       province = case when p_patch ? 'province' then nullif(p_patch->>'province','') else province end,
       country = case when p_patch ? 'country' then coalesce(nullif(p_patch->>'country',''), country) else country end,
       occupation = case when p_patch ? 'occupation' then nullif(p_patch->>'occupation','') else occupation end,
       employer = case when p_patch ? 'employer' then nullif(p_patch->>'employer','') else employer end,
       instagram_handle = case when p_patch ? 'instagram_handle' then nullif(p_patch->>'instagram_handle','') else instagram_handle end,
       facebook_profile = case when p_patch ? 'facebook_profile' then nullif(p_patch->>'facebook_profile','') else facebook_profile end,
       vet_name = case when p_patch ? 'vet_name' then nullif(p_patch->>'vet_name','') else vet_name end,
       vet_phone = case when p_patch ? 'vet_phone' then nullif(p_patch->>'vet_phone','') else vet_phone end,
       personal_reference_name = case when p_patch ? 'personal_reference_name' then nullif(p_patch->>'personal_reference_name','') else personal_reference_name end,
       personal_reference_phone = case when p_patch ? 'personal_reference_phone' then nullif(p_patch->>'personal_reference_phone','') else personal_reference_phone end,
       special_requests = case when p_patch ? 'special_requests' then nullif(p_patch->>'special_requests','') else special_requests end,
       dog_interest = case when p_patch ? 'dog_interest' then nullif(p_patch->>'dog_interest','') else dog_interest end,
       specific_dog_id = case when p_patch ? 'specific_dog_id' then nullif(p_patch->>'specific_dog_id','')::uuid else specific_dog_id end,
       litter_interest_id = case when p_patch ? 'litter_interest_id' then nullif(p_patch->>'litter_interest_id','')::uuid else litter_interest_id end,
       preferred_sex = case when p_patch ? 'preferred_sex' then nullif(p_patch->>'preferred_sex','') else preferred_sex end,
       preferred_colour = case when p_patch ? 'preferred_colour' then nullif(p_patch->>'preferred_colour','') else preferred_colour end,
       tail_preference = case when p_patch ? 'tail_preference' then nullif(p_patch->>'tail_preference','') else tail_preference end,
       preferred_timeline = case when p_patch ? 'preferred_timeline' then nullif(p_patch->>'preferred_timeline','') else preferred_timeline end,
       budget_range = case when p_patch ? 'budget_range' then nullif(p_patch->>'budget_range','') else budget_range end,
       purpose = case when p_patch ? 'purpose' then nullif(p_patch->>'purpose','') else purpose end,
       security_requirements = case when p_patch ? 'security_requirements' then nullif(p_patch->>'security_requirements','') else security_requirements end,
       training_planned = case when p_patch ? 'training_planned' then (p_patch->>'training_planned')::boolean else training_planned end,
       status = case
         when touched = 'reapproval' and rec.status in ('approved', 'changes_pending')
         then 'changes_pending'
         else rec.status
       end,
       updated_at = now()
   where id = rec.id
   returning * into rec;

  select coalesce(max(version_number), 0) + 1 into next_n
    from public.application_versions
   where application_id = rec.id;

  insert into public.application_versions (
    application_id, version_number, snapshot, changed_by, changed_at, change_reason, tier_touched
  ) values (
    rec.id, next_n, to_jsonb(rec), auth.uid(), now(),
    case when touched = 'reapproval' then 'Preference change' else 'Contact details' end,
    touched
  );

  insert into public.application_events (
    application_id, event_type, from_status, to_status, message, created_by
  ) values (
    rec.id, 'applicant_edit', old_val->>'status', rec.status,
    left('Applicant updated ' || touched || ' fields', 500),
    auth.uid()
  );

  return jsonb_build_object(
    'ok', true,
    'status', rec.status,
    'version_number', next_n,
    'reviewed_at', rec.reviewed_at,
    'tier_touched', touched
  );
end;
$$;

revoke all on function public.save_application_amendment(uuid, jsonb) from public, anon;
grant execute on function public.save_application_amendment(uuid, jsonb) to authenticated;

-- Re-approve: restore approved, keep reviewed_at, stamp version, audit.
create or replace function public.reapprove_application_changes(p_application_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  rec public.applications%rowtype;
  v int;
  actor uuid := auth.uid();
begin
  if not public.is_admin() then
    raise exception 'NOT_ADMIN';
  end if;

  select * into rec from public.applications where id = p_application_id;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  if rec.status is distinct from 'changes_pending' then
    raise exception 'NOT_CHANGES_PENDING';
  end if;

  select coalesce(max(version_number), 1) into v
    from public.application_versions
   where application_id = rec.id;

  update public.applications
     set status = 'approved',
         approved_version_number = v,
         updated_at = now()
   where id = rec.id
   returning * into rec;

  insert into public.application_events (
    application_id, event_type, from_status, to_status, message, created_by
  ) values (
    rec.id, 'reapproved', 'changes_pending', 'approved',
    'Re-approved version ' || rec.approved_version_number, actor
  );

  insert into public.audit_log (
    table_name, record_id, action, actor_id, old_values, new_values, changed_fields
  ) values (
    'applications',
    rec.id::text,
    'update',
    actor,
    jsonb_build_object(
      'status', 'changes_pending',
      'approved_version_number', rec.approved_version_number
    ),
    jsonb_build_object(
      'status', 'approved',
      'approved_version_number', rec.approved_version_number,
      'reviewed_at', rec.reviewed_at
    ),
    array['status', 'approved_version_number']
  );

  return jsonb_build_object(
    'ok', true,
    'status', rec.status,
    'reviewed_at', rec.reviewed_at,
    'approved_version_number', rec.approved_version_number
  );
end;
$$;

revoke all on function public.reapprove_application_changes(uuid) from public, anon;
grant execute on function public.reapprove_application_changes(uuid) to authenticated;
