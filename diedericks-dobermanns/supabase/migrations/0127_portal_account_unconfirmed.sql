-- 0127 — Sale linking matches any portal login for that email, not only a
-- confirmed one (invite creates the login before they open it). Collision
-- records on the contact so a rate-limit on error_events cannot swallow it.

create or replace function public.portal_account_id_for_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
  select u.id
    from auth.users u
   where p_email is not null
     and btrim(p_email) <> ''
     and lower(u.email) = lower(btrim(p_email))
   limit 1;
$$;

create or replace function public.resolve_confirmed_user_id(p_email text)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'auth', 'pg_temp'
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'not allowed';
  end if;
  select u.id into v_id
    from auth.users u
   where p_email is not null
     and btrim(p_email) <> ''
     and lower(u.email) = lower(btrim(p_email))
     and u.email_confirmed_at is not null
   limit 1;
  return v_id;
end;
$$;
