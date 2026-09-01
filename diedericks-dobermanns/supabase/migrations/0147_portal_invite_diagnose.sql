-- 0147 — Name invite failures. Diagnostic columns and an anon-safe lookup
-- that never returns a code or a hash. Does not change issuance, mail, or
-- redemption success. Does not rate-limit redemption.

alter table public.portal_invites
  add column failed_attempts integer not null default 0,
  add column last_failed_at timestamptz,
  add column last_failed_reason text
    check (last_failed_reason is null or last_failed_reason in
      ('wrong-code','expired','used','no-invite'));

comment on column public.portal_invites.failed_attempts is
  'Diagnostic count of failed redemptions. Not a lockout.';
comment on column public.portal_invites.last_failed_reason is
  'Last failed redemption reason: wrong-code, expired, used, no-invite.';

-- Anon may call this. Returns only whether an invite exists and its dates.
-- Never returns code_hash, the digits, or the invite id.
create or replace function public.portal_invite_diagnose(p_email text)
returns table (
  "exists" boolean,
  expires_at timestamptz,
  code_redeemed_at timestamptz,
  invited_at timestamptz
)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_expires timestamptz;
  v_redeemed timestamptz;
  v_invited timestamptz;
begin
  if v_email = '' or position('@' in v_email) = 0 then
    return query select false, null::timestamptz, null::timestamptz, null::timestamptz;
    return;
  end if;

  select i.expires_at, i.code_redeemed_at, i.invited_at
    into v_expires, v_redeemed, v_invited
    from public.portal_invites i
   where lower(btrim(i.email)) = v_email
   order by i.invited_at desc
   limit 1;

  if not found then
    return query select false, null::timestamptz, null::timestamptz, null::timestamptz;
    return;
  end if;

  return query select true, v_expires, v_redeemed, v_invited;
end;
$$;

comment on function public.portal_invite_diagnose(text) is
  'Latest invite dates for an email. Anon-safe: no hash, no code, no id.';

revoke all on function public.portal_invite_diagnose(text) from public;
grant execute on function public.portal_invite_diagnose(text)
  to anon, authenticated, service_role;

-- Stamp a failed attempt on the latest invite for this email. No-op if none.
create or replace function public.portal_invite_record_failure(
  p_email text,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  if v_email = '' or p_reason is null
     or p_reason not in ('wrong-code', 'expired', 'used', 'no-invite') then
    return;
  end if;

  update public.portal_invites
     set failed_attempts = failed_attempts + 1,
         last_failed_at = now(),
         last_failed_reason = p_reason
   where id = (
     select i.id from public.portal_invites i
      where lower(btrim(i.email)) = v_email
      order by i.invited_at desc
      limit 1
   );
end;
$$;

revoke all on function public.portal_invite_record_failure(text, text) from public, anon;
grant execute on function public.portal_invite_record_failure(text, text)
  to authenticated, service_role;

drop function if exists public.portal_invite_states(text[]);

create or replace function public.portal_invite_states(p_emails text[])
returns table (
  email text,
  has_account boolean,
  invited_at timestamptz,
  last_sign_in_at timestamptz,
  email_confirmed_at timestamptz,
  last_get_at timestamptz,
  opened_at timestamptz,
  last_failed_at timestamptz,
  last_failed_reason text
)
language plpgsql
stable
security definer
set search_path to 'public', 'auth'
as $$
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  return query
  with wanted as (
    select distinct lower(btrim(e)) as email
      from unnest(coalesce(p_emails, '{}'::text[])) as e
     where e is not null and btrim(e) <> ''
  ),
  latest_invite as (
    select distinct on (i.email)
           i.email, i.invited_at, i.last_get_at, i.opened_at,
           i.last_failed_at, i.last_failed_reason
      from public.portal_invites i
      join wanted w on w.email = i.email
     order by i.email, i.invited_at desc
  )
  select
    w.email,
    (u.id is not null) as has_account,
    li.invited_at,
    u.last_sign_in_at,
    u.email_confirmed_at,
    li.last_get_at,
    li.opened_at,
    li.last_failed_at,
    li.last_failed_reason
  from wanted w
  left join auth.users u on lower(u.email) = w.email
  left join latest_invite li on li.email = w.email;
end;
$$;

revoke all on function public.portal_invite_states(text[]) from public, anon;
grant execute on function public.portal_invite_states(text[]) to authenticated;
