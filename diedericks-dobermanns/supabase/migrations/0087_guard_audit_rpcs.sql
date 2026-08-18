-- Admin-only guards on audit pause/resume/notes. Body otherwise unchanged.
-- Verified against pg_get_functiondef on 18 Aug 2026.

create or replace function public.pause_audit(p_reason text)
 returns text
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  r record;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  if coalesce(trim(p_reason), '') = '' then
    raise exception 'A reason is required — an unexplained gap in the audit log is worse than none.';
  end if;

  for r in
    select c.relname
      from pg_trigger t join pg_class c on c.oid = t.tgrelid
     where t.tgname = 'trg_audit' and not t.tgisinternal
  loop
    execute format('alter table public.%I disable trigger trg_audit', r.relname);
  end loop;

  update public.audit_pause_state
     set paused_at = now(), reason = p_reason, paused_by = auth.uid()
   where id;

  return 'Auditing paused: ' || p_reason;
end;
$function$;

create or replace function public.resume_audit()
 returns text
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  r record;
  v_since timestamptz;
  v_reason text;
  v_by uuid;
  v_mins numeric;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  select paused_at, reason, paused_by into v_since, v_reason, v_by
    from public.audit_pause_state where id;

  for r in
    select c.relname
      from pg_trigger t join pg_class c on c.oid = t.tgrelid
     where t.tgname = 'trg_audit' and not t.tgisinternal
  loop
    execute format('alter table public.%I enable trigger trg_audit', r.relname);
  end loop;

  update public.audit_pause_state
     set paused_at = null, reason = null, paused_by = null
   where id;

  if v_since is null then
    return 'Auditing was already active.';
  end if;

  v_mins := round(extract(epoch from (now() - v_since)) / 60.0, 1);

  insert into public.audit_log (table_name, record_id, action, actor_id, actor_role, new_values)
  values (
    'audit_log', 'pause', 'insert', v_by, 'system',
    jsonb_build_object(
      'event', 'auditing paused for a bulk operation',
      'reason', v_reason,
      'paused_at', v_since,
      'resumed_at', now(),
      'minutes', v_mins
    )
  );

  return format('Auditing resumed after %s minutes (%s).', v_mins, v_reason);
end;
$function$;

create or replace function public.set_audit_change_note(p_note text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  perform set_config('app.audit_change_note', coalesce(p_note, ''), true);
end;
$function$;

grant execute on function public.pause_audit(text) to authenticated, service_role;
grant execute on function public.resume_audit() to authenticated, service_role;
grant execute on function public.set_audit_change_note(text) to authenticated, service_role;
grant execute on function public.is_admin() to public, anon, authenticated, service_role;
grant execute on function public.is_trainer_or_above() to public, anon, authenticated, service_role;
