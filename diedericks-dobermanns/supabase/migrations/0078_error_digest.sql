-- 0078 — Next.js error digest on captured reports, so Vercel logs can be found.

alter table public.issue_reports add column if not exists digest text;
alter table public.error_events  add column if not exists digest text;

create index if not exists issue_reports_digest_idx
  on public.issue_reports (digest) where digest is not null;
create index if not exists error_events_digest_idx
  on public.error_events (digest) where digest is not null;

comment on column public.issue_reports.digest is
  'Next.js error digest. The only key that matches this report to the Vercel log line holding the real message.';
comment on column public.error_events.digest is
  'Next.js error digest when the event came from a Server Components render.';

-- Recreate capture_issue so digest is stored and part of the fingerprint.
drop function if exists public.capture_issue(text, text, text, text, text, text);

create or replace function public.capture_issue(
  p_title text,
  p_page_path text,
  p_detail text default null,
  p_user_agent text default null,
  p_error_message text default null,
  p_error_stack text default null,
  p_digest text default null
)
returns table(is_new boolean, occurrence integer, severity text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fingerprint text;
  v_existing public.issue_reports%rowtype;
  v_new_recent integer;
  v_severity text;
  v_count integer;
  v_role text;
  v_digest text;
begin
  if coalesce(trim(p_title), '') = '' and coalesce(trim(p_error_message), '') = '' then
    return;
  end if;

  v_digest := nullif(trim(p_digest), '');
  v_fingerprint := md5(
    coalesce(p_page_path, '/') || '|' ||
    coalesce(v_digest, coalesce(nullif(trim(p_error_message), ''), trim(p_title), ''))
  );

  select * into v_existing
    from public.issue_reports
   where fingerprint = v_fingerprint
   for update;

  if found then
    v_count := coalesce(v_existing.occurrence_count, 1) + 1;
    v_severity := case
      when v_count >= 10 and v_existing.severity <> 'critical' and v_existing.status = 'open'
        then 'critical'
      else v_existing.severity
    end;

    update public.issue_reports
       set occurrence_count = v_count,
           last_seen_at = now(),
           severity = v_severity,
           digest = coalesce(digest, v_digest),
           error_message = coalesce(p_error_message, error_message),
           error_stack = coalesce(left(p_error_stack, 4000), error_stack)
     where id = v_existing.id;

    return query select false, v_count, v_severity;
    return;
  end if;

  select count(*) into v_new_recent
    from public.issue_reports
   where source = 'captured' and created_at > now() - interval '1 hour';

  if v_new_recent >= 20 then
    return query select false, 0, 'low'::text;
    return;
  end if;

  if auth.uid() is null then
    v_role := 'signed_out';
  else
    select case
      when role in ('admin', 'super_admin', 'management') then 'admin'
      else 'client'
    end into v_role
      from public.users
     where id = auth.uid();
    v_role := coalesce(v_role, 'client');
  end if;

  insert into public.issue_reports (
    source, severity, status, title, detail, page_path, user_agent,
    reported_by, reporter_role, error_message, error_stack, fingerprint,
    digest, occurrence_count, last_seen_at
  ) values (
    'captured', 'normal', 'open',
    left(coalesce(nullif(trim(p_title), ''), trim(p_error_message)), 200),
    left(p_detail, 2000),
    left(coalesce(p_page_path, '/'), 500),
    left(p_user_agent, 500),
    auth.uid(),
    v_role,
    left(p_error_message, 2000),
    left(p_error_stack, 4000),
    v_fingerprint,
    v_digest,
    1, now()
  );

  return query select true, 1, 'normal'::text;
end;
$$;

grant execute on function public.capture_issue(
  text, text, text, text, text, text, text
) to anon, authenticated;
