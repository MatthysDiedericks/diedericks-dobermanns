-- 0123 — Invite codes that a mail scanner cannot consume, and the stuck state
-- (email confirmed, never signed in) that locked Josef out.

alter table public.portal_invites
  add column if not exists code_hash text,
  add column if not exists expires_at timestamptz not null default (now() + interval '7 days');

comment on column public.portal_invites.expires_at is
  'Invite code and click-to-open link last 7 days from issue. Re-issue does not invalidate earlier rows.';

create index if not exists portal_invites_code_hash_idx
  on public.portal_invites (email, code_hash)
  where code_hash is not null;

-- Anon redeem looks up a valid invite by id (unguessable uuid). No session.
create or replace function public.portal_invite_for_redeem(p_id uuid)
returns table (
  email text,
  user_id uuid,
  expires_at timestamptz
)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  return query
  select i.email, i.user_id, i.expires_at
    from public.portal_invites i
   where i.id = p_id
     and i.expires_at > now()
   limit 1;
end;
$$;

create or replace function public.portal_invite_for_code(p_email text, p_code_hash text)
returns table (
  id uuid,
  email text,
  user_id uuid,
  expires_at timestamptz
)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if p_email is null or p_code_hash is null then
    return;
  end if;
  return query
  select i.id, i.email, i.user_id, i.expires_at
    from public.portal_invites i
   where lower(btrim(i.email)) = lower(btrim(p_email))
     and i.code_hash = p_code_hash
     and i.expires_at > now()
   order by i.invited_at desc
   limit 1;
end;
$$;

revoke all on function public.portal_invite_for_redeem(uuid) from public, anon;
revoke all on function public.portal_invite_for_code(text, text) from public, anon;
grant execute on function public.portal_invite_for_redeem(uuid) to anon, authenticated, service_role;
grant execute on function public.portal_invite_for_code(text, text) to anon, authenticated, service_role;

drop function if exists public.portal_invite_states(text[]);

create or replace function public.portal_invite_states(p_emails text[])
returns table (
  email text,
  has_account boolean,
  invited_at timestamptz,
  last_sign_in_at timestamptz,
  email_confirmed_at timestamptz
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
    select distinct on (i.email) i.email, i.invited_at
      from public.portal_invites i
      join wanted w on w.email = i.email
     order by i.email, i.invited_at desc
  )
  select
    w.email,
    (u.id is not null) as has_account,
    li.invited_at,
    u.last_sign_in_at,
    u.email_confirmed_at
  from wanted w
  left join auth.users u on lower(u.email) = w.email
  left join latest_invite li on li.email = w.email;
end;
$$;

-- Confirmed by a scanner (or a tap that never finished sign-in) — locked out.
create or replace function public.count_confirmed_never_signed_in()
returns integer
language plpgsql
stable
security definer
set search_path to 'public', 'auth'
as $$
declare
  n integer := 0;
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;
  select count(*)::int into n
    from auth.users u
    join public.users p on p.id = u.id
   where p.role = 'client'
     and u.email_confirmed_at is not null
     and u.last_sign_in_at is null;
  return coalesce(n, 0);
end;
$$;

revoke all on function public.count_confirmed_never_signed_in() from public, anon;
grant execute on function public.count_confirmed_never_signed_in() to authenticated;
grant execute on function public.portal_invite_states(text[]) to authenticated;
