-- 0112 — Portal invite links (no password). Admin issues a magic-link sign-in.
-- Tracking: invited vs opened vs signed in. RPCs are admin-only except mark-opened.

create table if not exists public.portal_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  user_id uuid references auth.users (id) on delete set null,
  invited_at timestamptz not null default now(),
  invited_by uuid not null references public.users (id),
  opened_at timestamptz,
  source text not null check (source in ('application', 'waiting_list', 'client')),
  source_id uuid
);

create index if not exists portal_invites_email_idx
  on public.portal_invites (email, invited_at desc);
create index if not exists portal_invites_user_idx
  on public.portal_invites (user_id);

alter table public.portal_invites enable row level security;

revoke all on public.portal_invites from anon, public;
grant select on public.portal_invites to authenticated;

drop policy if exists portal_invites_admin_read on public.portal_invites;
create policy portal_invites_admin_read
  on public.portal_invites
  for select
  to authenticated
  using (public.is_admin());

-- Latest invite + auth.users.last_sign_in_at for a list of emails.
create or replace function public.portal_invite_states(p_emails text[])
returns table (
  email text,
  has_account boolean,
  invited_at timestamptz,
  last_sign_in_at timestamptz
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
    u.last_sign_in_at
  from wanted w
  left join auth.users u on lower(u.email) = w.email
  left join latest_invite li on li.email = w.email;
end;
$$;

-- Buyer landed from the invite link. Session required — never takes an email.
create or replace function public.mark_portal_invite_opened()
returns void
language plpgsql
security definer
set search_path to 'public', 'auth'
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
begin
  if v_uid is null then
    return;
  end if;
  select lower(u.email) into v_email from auth.users u where u.id = v_uid;
  update public.portal_invites
     set opened_at = coalesce(opened_at, now())
   where opened_at is null
     and (user_id = v_uid or email = v_email);
end;
$$;

-- Invited, never signed in — the quietly stuck buyers.
create or replace function public.count_unopened_portal_invites()
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
    from (
      select distinct on (i.email) i.email
        from public.portal_invites i
       order by i.email, i.invited_at desc
    ) latest
    left join auth.users u on lower(u.email) = latest.email
   where u.last_sign_in_at is null;
  return coalesce(n, 0);
end;
$$;

revoke all on function public.portal_invite_states(text[]) from public, anon;
revoke all on function public.mark_portal_invite_opened() from public, anon;
revoke all on function public.count_unopened_portal_invites() from public, anon;

grant execute on function public.portal_invite_states(text[]) to authenticated;
grant execute on function public.mark_portal_invite_opened() to authenticated;
grant execute on function public.count_unopened_portal_invites() to authenticated;
