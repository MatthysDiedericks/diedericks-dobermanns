-- Log invalid unsubscribe tokens. Body otherwise matches 0096.

create or replace function public.apply_marketing_opt_out(
  p_token text,
  p_allow_expired boolean default false
)
returns text
language plpgsql
security definer
set search_path = public, private
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
    return public.note_invalid_unsubscribe();
  end if;

  select s.value into v_secret
    from private.app_secrets s
   where s.name = 'UNSUBSCRIBE_SECRET';
  if v_secret is null then
    return public.note_invalid_unsubscribe();
  end if;

  v_parts := string_to_array(trim(p_token), '.');
  if array_length(v_parts, 1) is distinct from 3 then
    return public.note_invalid_unsubscribe();
  end if;

  begin
    v_contact_id := v_parts[1]::uuid;
  exception when others then
    return public.note_invalid_unsubscribe();
  end;

  begin
    v_expiry := v_parts[2]::bigint;
  exception when others then
    return public.note_invalid_unsubscribe();
  end;

  v_sig := lower(v_parts[3]);
  if v_sig !~ '^[0-9a-f]{64}$' then
    return public.note_invalid_unsubscribe();
  end if;

  v_msg := v_contact_id::text || '|marketing_opt_out|' || v_expiry::text;
  v_expected := encode(hmac(v_msg, v_secret, 'sha256'), 'hex');
  if v_expected is distinct from v_sig then
    return public.note_invalid_unsubscribe();
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
