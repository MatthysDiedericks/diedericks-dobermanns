-- Quotes into portals: resolve confirmed accounts by email (admin only),
-- and back-fill orphaned application/quote links where a confirmed account exists.

create or replace function public.resolve_confirmed_user_id(p_email text)
returns uuid
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'not allowed';
  end if;

  if p_email is null or length(trim(p_email)) = 0 then
    return null;
  end if;

  select u.id
    into v_id
    from auth.users u
   where lower(u.email) = lower(trim(p_email))
     and u.email_confirmed_at is not null
   limit 1;

  return v_id;
end;
$$;

revoke all on function public.resolve_confirmed_user_id(text) from public;
grant execute on function public.resolve_confirmed_user_id(text) to authenticated, service_role;

-- Referenced by pipeline helpers / syncFromApplication; ensure the column exists.
alter table public.waiting_list
  add column if not exists stage_change_note text;

-- Safety-net back-fill: confirmed account + matching application email → link.
update public.applications a
   set user_id = u.id
  from auth.users u
 where a.user_id is null
   and u.email_confirmed_at is not null
   and lower(trim(a.email)) = lower(u.email);

update public.quotes q
   set client_id = a.user_id
  from public.applications a
 where q.client_id is null
   and q.application_id = a.id
   and a.user_id is not null;
