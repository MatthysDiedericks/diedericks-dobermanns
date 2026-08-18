-- Re-run remainder of 0099 after category fix. Safe to repeat.

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
