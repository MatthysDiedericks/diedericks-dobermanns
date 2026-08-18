-- RPC denied logging on audit guards, invalid unsubscribe tokens, monthly backup reminder.
-- Function bodies otherwise match 0087 / 0096. Never revoke is_admin().

create or replace function public.pause_audit(p_reason text)
 returns text
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  r record;
begin
  perform public.security_require_admin('pause_audit');

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
  perform public.security_require_admin('resume_audit');

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
  perform public.security_require_admin('set_audit_change_note');
  perform set_config('app.audit_change_note', coalesce(p_note, ''), true);
end;
$function$;

create or replace function public.note_invalid_unsubscribe()
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.log_security_event(
    'SECURITY_TOKEN_INVALID', 'other', 'warning',
    'Unsubscribe token was not valid', '{}'::jsonb, 'apply_marketing_opt_out'
  );
  return 'invalid';
end;
$$;

grant execute on function public.note_invalid_unsubscribe() to anon, authenticated, service_role;

create or replace function public.ensure_backup_restore_reminder()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.todo_items (title, description, category, priority, due_date)
  select
    'Confirm the last backup restored cleanly.',
    'Open docs/RESTORE.md. Restore is a hope until you have done it once. Storage files are not in the Postgres backup.',
    'admin',
    'high',
    (date_trunc('month', now() at time zone 'Africa/Johannesburg') + interval '1 month' - interval '1 day')::date
  where not exists (
    select 1 from public.todo_items
     where title = 'Confirm the last backup restored cleanly.'
       and created_at >= date_trunc('month', now() at time zone 'Africa/Johannesburg')
       and is_completed = false
  );
end;
$$;

select public.ensure_backup_restore_reminder();

do $$
begin
  perform cron.unschedule('backup-restore-reminder-monthly');
exception when others then
  null;
end;
$$;

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'backup-restore-reminder-monthly',
      '0 7 1 * *',
      'select public.ensure_backup_restore_reminder()'
    );
  end if;
end;
$$;

grant execute on function public.pause_audit(text) to authenticated, service_role;
grant execute on function public.resume_audit() to authenticated, service_role;
grant execute on function public.set_audit_change_note(text) to authenticated, service_role;
grant execute on function public.is_admin() to public, anon, authenticated, service_role;
grant execute on function public.is_trainer_or_above() to public, anon, authenticated, service_role;
