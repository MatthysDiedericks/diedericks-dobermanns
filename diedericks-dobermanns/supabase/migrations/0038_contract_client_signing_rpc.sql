-- Fixes two blocking bugs found in the contract e-sign flow (0037):
--
-- 1. `contracts` RLS only grants clients SELECT ("Clients can view own
--    contracts") — there is no UPDATE policy, so the portal's in-app
--    signature flow could never actually save a signature as the signed-in
--    client. Per the task brief we must not touch the existing admin/client
--    policies, so instead of widening RLS we add a narrow SECURITY DEFINER
--    RPC that only lets a client sign their *own*, *not-yet-signed* contract,
--    and only sets the signature-audit columns — nothing else on the row is
--    writable this way.
-- 2. `contracts_status_check` only allows
--    ('draft','sent','signed_client','signed_both','void') — the app was
--    writing status = 'signed', which isn't in that list and would have
--    made every real signature attempt fail with a constraint violation.
--    `sign_contract_as_client` below uses the correct 'signed_client' value.

create or replace function public.sign_contract_as_client(
  p_contract_id uuid,
  p_signature_url text,
  p_device text,
  p_ip text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_client_id uuid;
  v_already_signed boolean;
begin
  select client_id, signed_by_client into v_client_id, v_already_signed
  from public.contracts
  where id = p_contract_id
  for update;

  if v_client_id is null then
    raise exception 'Contract not found';
  end if;

  if v_client_id <> auth.uid() then
    raise exception 'Not authorised to sign this contract';
  end if;

  if v_already_signed then
    raise exception 'Contract is already signed';
  end if;

  update public.contracts
  set
    signed_by_client = true,
    signed_at = now(),
    client_signed_at = now(),
    client_signature_url = p_signature_url,
    client_signature_device = p_device,
    client_ip_on_sign = p_ip,
    status = 'signed_client'
  where id = p_contract_id;
end;
$$;

grant execute on function public.sign_contract_as_client(uuid, text, text, text) to authenticated;
