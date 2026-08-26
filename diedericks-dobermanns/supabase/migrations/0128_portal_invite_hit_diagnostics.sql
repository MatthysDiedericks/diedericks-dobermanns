-- 0128 — Confirm-link diagnostics. GET never verifies a token; these columns
-- record the *client* user agent and IP, and whether the request was a GET
-- render or the POST that actually signs in. That is what was missing when
-- Josef's link was spent at 06:53 by a request that looked like user_agent node.

alter table public.portal_invites
  add column if not exists last_get_at timestamptz,
  add column if not exists last_get_user_agent text,
  add column if not exists last_get_ip text,
  add column if not exists last_post_at timestamptz,
  add column if not exists last_post_user_agent text,
  add column if not exists last_post_ip text,
  add column if not exists code_redeemed_at timestamptz;

comment on column public.portal_invites.last_get_at is
  'Client fetched the confirm page. Does not mean they signed in. Preview bots set this.';
comment on column public.portal_invites.last_get_user_agent is
  'User-Agent of the confirm GET — the client, not our Node server.';
comment on column public.portal_invites.last_post_user_agent is
  'User-Agent of the confirm POST (the Sign in tap).';
comment on column public.portal_invites.code_redeemed_at is
  'Set after a 6-digit code successfully signs in. Codes are single-use.';

create or replace function public.record_portal_invite_hit(
  p_id uuid,
  p_email text,
  p_method text,
  p_user_agent text,
  p_ip text
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_ua text := left(coalesce(p_user_agent, ''), 500);
  v_ip text := left(coalesce(p_ip, ''), 64);
  v_method text := upper(coalesce(p_method, ''));
begin
  if v_method not in ('GET', 'POST') then
    return;
  end if;

  if p_id is not null then
    if v_method = 'GET' then
      update public.portal_invites
         set last_get_at = now(),
             last_get_user_agent = v_ua,
             last_get_ip = v_ip
       where id = p_id;
    else
      update public.portal_invites
         set last_post_at = now(),
             last_post_user_agent = v_ua,
             last_post_ip = v_ip
       where id = p_id;
    end if;
    return;
  end if;

  if p_email is null or btrim(p_email) = '' then
    return;
  end if;

  if v_method = 'GET' then
    update public.portal_invites
       set last_get_at = now(),
           last_get_user_agent = v_ua,
           last_get_ip = v_ip
     where id = (
       select i.id from public.portal_invites i
        where lower(i.email) = lower(btrim(p_email))
        order by i.invited_at desc
        limit 1
     );
  else
    update public.portal_invites
       set last_post_at = now(),
           last_post_user_agent = v_ua,
           last_post_ip = v_ip
     where id = (
       select i.id from public.portal_invites i
        where lower(i.email) = lower(btrim(p_email))
        order by i.invited_at desc
        limit 1
     );
  end if;
end;
$$;

revoke all on function public.record_portal_invite_hit(uuid, text, text, text, text)
  from public, anon;
grant execute on function public.record_portal_invite_hit(uuid, text, text, text, text)
  to anon, authenticated, service_role;

create or replace function public.portal_invite_inspect(p_id uuid)
returns table (
  email text,
  user_id uuid,
  expires_at timestamptz,
  opened_at timestamptz,
  last_get_at timestamptz,
  invited_at timestamptz,
  code_redeemed_at timestamptz
)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if p_id is null then
    return;
  end if;
  return query
  select i.email, i.user_id, i.expires_at, i.opened_at,
         i.last_get_at, i.invited_at, i.code_redeemed_at
    from public.portal_invites i
   where i.id = p_id
   limit 1;
end;
$$;

revoke all on function public.portal_invite_inspect(uuid) from public, anon;
grant execute on function public.portal_invite_inspect(uuid)
  to anon, authenticated, service_role;

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
     and i.code_redeemed_at is null
     and i.expires_at > now()
   order by i.invited_at desc
   limit 1;
end;
$$;

drop function if exists public.portal_invite_states(text[]);

create or replace function public.portal_invite_states(p_emails text[])
returns table (
  email text,
  has_account boolean,
  invited_at timestamptz,
  last_sign_in_at timestamptz,
  email_confirmed_at timestamptz,
  last_get_at timestamptz,
  opened_at timestamptz
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
           i.email, i.invited_at, i.last_get_at, i.opened_at
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
    li.opened_at
  from wanted w
  left join auth.users u on lower(u.email) = w.email
  left join latest_invite li on li.email = w.email;
end;
$$;

revoke all on function public.portal_invite_states(text[]) from public, anon;
grant execute on function public.portal_invite_states(text[]) to authenticated;
