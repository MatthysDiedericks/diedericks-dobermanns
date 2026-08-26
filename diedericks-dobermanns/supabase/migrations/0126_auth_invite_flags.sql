-- 0126 — Lookup confirmed/signed-in flags by email for invite failure logging.
-- Distinguishes a scanner-consumed link from a timeout.

create or replace function public.auth_invite_flags(p_email text)
returns table (
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz
)
language sql
stable
security definer
set search_path to 'auth', 'public', 'pg_temp'
as $$
  select u.email_confirmed_at, u.last_sign_in_at
    from auth.users u
   where p_email is not null
     and lower(u.email) = lower(btrim(p_email))
   limit 1;
$$;

revoke all on function public.auth_invite_flags(text) from public, anon;
grant execute on function public.auth_invite_flags(text) to service_role, authenticated;
