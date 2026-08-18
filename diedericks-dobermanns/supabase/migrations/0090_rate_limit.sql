-- Rate limits in Postgres. Keys are sha256 hashes. Never store a raw IP.

create extension if not exists pgcrypto;

create table if not exists public.rate_limit_secrets (
  id boolean primary key default true check (id),
  salt text not null
);
alter table public.rate_limit_secrets enable row level security;
insert into public.rate_limit_secrets (id, salt)
values (true, encode(gen_random_bytes(32), 'hex'))
on conflict (id) do nothing;

create table if not exists public.rate_limit_buckets (
  key           text primary key,
  action        text not null,
  window_start  timestamptz not null default now(),
  hit_count     int not null default 1,
  blocked_until timestamptz
);
alter table public.rate_limit_buckets enable row level security;

create or replace function public.rate_limit_request_key(p_action text)
returns text
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  headers jsonb := '{}'::jsonb;
  ua text := '';
  fwd text := '';
  salt text;
  raw text;
begin
  begin
    headers := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  exception when others then
    headers := '{}'::jsonb;
  end;
  ua := coalesce(headers->>'user-agent', '');
  raw := coalesce(headers->>'x-forwarded-for', headers->>'cf-connecting-ip', '');
  fwd := split_part(raw, ',', 1);
  select s.salt into salt from public.rate_limit_secrets s where s.id;
  -- Hash immediately. fwd/ua/raw never written to a table.
  return encode(
    digest(coalesce(salt, '') || ':' || fwd || ':' || ua || ':' || coalesce(p_action, ''), 'sha256'),
    'hex'
  );
end;
$$;

create or replace function public.check_rate_limit(
  p_action text,
  p_key text,
  p_max int,
  p_window_seconds int,
  p_hit boolean default true
)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $$
declare
  v_key text;
  v_row public.rate_limit_buckets%rowtype;
  v_window interval;
begin
  v_key := nullif(btrim(coalesce(p_key, '')), '');
  if v_key is null then
    v_key := public.rate_limit_request_key(p_action);
  end if;
  v_window := make_interval(secs => greatest(coalesce(p_window_seconds, 60), 1));

  if random() < 0.02 then
    delete from public.rate_limit_buckets
     where window_start < now() - interval '24 hours'
       and (blocked_until is null or blocked_until < now());
  end if;

  select * into v_row from public.rate_limit_buckets where key = v_key;
  if not found then
    if p_hit then
      insert into public.rate_limit_buckets (key, action, window_start, hit_count)
      values (v_key, p_action, now(), 1);
    end if;
    return true;
  end if;

  if v_row.blocked_until is not null and v_row.blocked_until > now() then
    return false;
  end if;

  if v_row.window_start < now() - v_window then
    if p_hit then
      update public.rate_limit_buckets
         set window_start = now(), hit_count = 1, blocked_until = null, action = p_action
       where key = v_key;
    end if;
    return true;
  end if;

  if not p_hit then
    return v_row.hit_count < p_max;
  end if;

  update public.rate_limit_buckets
     set hit_count = hit_count + 1,
         blocked_until = case
           when hit_count + 1 >= p_max then now() + v_window
           else blocked_until
         end
   where key = v_key
  returning * into v_row;

  return v_row.hit_count <= p_max;
end;
$$;

-- Internal hasher. Callers use check_rate_limit, which is SECURITY DEFINER.
revoke all on function public.rate_limit_request_key(text) from public, anon, authenticated;
grant execute on function public.rate_limit_request_key(text) to service_role;

grant execute on function public.check_rate_limit(text, text, integer, integer, boolean)
  to anon, authenticated, service_role;
grant execute on function public.is_admin() to public, anon, authenticated, service_role;
grant execute on function public.is_trainer_or_above() to public, anon, authenticated, service_role;
