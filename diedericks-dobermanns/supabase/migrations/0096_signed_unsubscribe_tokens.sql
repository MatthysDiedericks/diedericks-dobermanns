-- Phase 2: replace bare-ID apply_marketing_opt_out with a signed token.
-- Unsubscribe stays callable without a session (POPIA s69). The token is the auth.
-- Do not revoke EXECUTE on is_admin() or is_trainer_or_above().
--
-- Numbered after Phase 1 (0086–0092). Do not apply until Phase 1 is verified.
-- Applying this drops apply_marketing_opt_out(uuid) and would break live
-- unsubscribe links until the signed-token mailer ships.

create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to postgres, service_role;

create table if not exists private.app_secrets (
  name text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);
alter table private.app_secrets enable row level security;
revoke all on table private.app_secrets from public, anon, authenticated;
grant all on table private.app_secrets to postgres, service_role;

create or replace function public.set_app_secret(p_name text, p_value text)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'service_role only' using errcode = '42501';
  end if;
  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'secret name required';
  end if;
  if p_value is null or length(p_value) < 32 then
    raise exception 'secret value too short';
  end if;
  insert into private.app_secrets (name, value)
  values (p_name, p_value)
  on conflict (name) do update
     set value = excluded.value, updated_at = now();
end;
$$;

revoke all on function public.set_app_secret(text, text) from public, anon, authenticated;
grant execute on function public.set_app_secret(text, text) to service_role;

create or replace function public.get_app_secret(p_name text)
returns text
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'service_role only' using errcode = '42501';
  end if;
  return (select s.value from private.app_secrets s where s.name = p_name);
end;
$$;

revoke all on function public.get_app_secret(text) from public, anon, authenticated;
grant execute on function public.get_app_secret(text) to service_role;

insert into private.app_secrets (name, value)
select 'UNSUBSCRIBE_SECRET', encode(gen_random_bytes(32), 'hex')
where not exists (
  select 1 from private.app_secrets s where s.name = 'UNSUBSCRIBE_SECRET'
);

-- Drop the unguarded uuid form. A bare contact ID must no longer work.
drop function if exists public.apply_marketing_opt_out(uuid);

create or replace function public.apply_marketing_opt_out(
  p_token text,
  p_allow_expired boolean default false
)
returns text
language plpgsql
security definer
set search_path = public, private, extensions
as $$
declare
  v_secret text;
  v_parts text[];
  v_contact_id uuid;
  v_expiry bigint;
  v_sig text;
  v_msg text;
  v_expected text;
  v_now bigint;
begin
  if p_token is null or length(trim(p_token)) = 0 then
    return 'invalid';
  end if;

  select s.value into v_secret
    from private.app_secrets s
   where s.name = 'UNSUBSCRIBE_SECRET';
  if v_secret is null then
    return 'invalid';
  end if;

  v_parts := string_to_array(trim(p_token), '.');
  if array_length(v_parts, 1) is distinct from 3 then
    return 'invalid';
  end if;

  begin
    v_contact_id := v_parts[1]::uuid;
  exception when others then
    return 'invalid';
  end;

  begin
    v_expiry := v_parts[2]::bigint;
  exception when others then
    return 'invalid';
  end;

  v_sig := lower(v_parts[3]);
  if v_sig !~ '^[0-9a-f]{64}$' then
    return 'invalid';
  end if;

  v_msg := v_contact_id::text || '|marketing_opt_out|' || v_expiry::text;
  v_expected := encode(extensions.hmac(v_msg, v_secret, 'sha256'::text), 'hex');
  if v_expected is distinct from v_sig then
    return 'invalid';
  end if;

  v_now := floor(extract(epoch from now()))::bigint;
  if v_expiry < v_now and not coalesce(p_allow_expired, false) then
    return 'expired';
  end if;

  update public.contacts
     set marketing_opt_in = false,
         marketing_opt_out_at = now(),
         updated_at = now()
   where id = v_contact_id;
  update public.users u
     set marketing_opt_in = false
    from public.contacts c
   where c.id = v_contact_id and u.id = c.user_id;

  return 'applied';
end;
$$;

revoke all on function public.apply_marketing_opt_out(text, boolean) from public;
grant execute on function public.apply_marketing_opt_out(text, boolean)
  to anon, authenticated, service_role;
