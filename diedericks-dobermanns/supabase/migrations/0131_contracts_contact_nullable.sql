-- 0131 — A contract is for a person (contact), not a portal login.
-- client_id stays for portal users; it is no longer required to create a row.

alter table public.contracts
  alter column client_id drop not null;

alter table public.contracts
  add column if not exists contact_id uuid references public.contacts (id);

alter table public.contracts
  add column if not exists quote_id uuid references public.quotes (id);

alter table public.contracts
  add column if not exists invoice_id uuid references public.invoices (id);

create index if not exists contracts_contact_id_idx
  on public.contracts (contact_id)
  where contact_id is not null;

create unique index if not exists contracts_esign_token_uidx
  on public.contracts (esign_token)
  where esign_token is not null;

create unique index if not exists contract_acks_contract_clause_uidx
  on public.contract_acknowledgements (contract_id, clause_ref);

alter table public.contracts drop constraint if exists contracts_party_required;
alter table public.contracts
  add constraint contracts_party_required
  check (contact_id is not null or client_id is not null);

create or replace function public.my_contact_ids()
returns setof uuid
language sql
stable
security definer
set search_path to 'public'
as $$
  select c.id from public.contacts c where c.user_id = auth.uid();
$$;

grant execute on function public.my_contact_ids() to authenticated, anon, service_role;

drop policy if exists "contracts read own" on public.contracts;
drop policy if exists "Clients can view own contracts" on public.contracts;
create policy "contracts read own" on public.contracts
  for select using (
    public.is_admin()
    or client_id = auth.uid()
    or contact_id in (select public.my_contact_ids())
  );

drop policy if exists "contracts client sign" on public.contracts;
create policy "contracts client sign" on public.contracts
  for update using (
    client_id = auth.uid()
    or contact_id in (select public.my_contact_ids())
  ) with check (
    client_id = auth.uid()
    or contact_id in (select public.my_contact_ids())
  );

alter table public.contract_acknowledgements enable row level security;
drop policy if exists "acks read own" on public.contract_acknowledgements;
drop policy if exists "acks insert own" on public.contract_acknowledgements;
drop policy if exists "acks admin all" on public.contract_acknowledgements;
create policy "acks read own" on public.contract_acknowledgements
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.contracts ct
      where ct.id = contract_id
        and (
          ct.client_id = auth.uid()
          or ct.contact_id in (select public.my_contact_ids())
        )
    )
  );
create policy "acks insert own" on public.contract_acknowledgements
  for insert with check (
    public.is_admin()
    or exists (
      select 1 from public.contracts ct
      where ct.id = contract_id
        and (
          ct.client_id = auth.uid()
          or ct.contact_id in (select public.my_contact_ids())
        )
    )
  );
create policy "acks admin all" on public.contract_acknowledgements
  for all using (public.is_admin()) with check (public.is_admin());

alter table public.contract_events enable row level security;
drop policy if exists "events read own" on public.contract_events;
drop policy if exists "events insert own" on public.contract_events;
drop policy if exists "events admin all" on public.contract_events;
create policy "events read own" on public.contract_events
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.contracts ct
      where ct.id = contract_id
        and (
          ct.client_id = auth.uid()
          or ct.contact_id in (select public.my_contact_ids())
        )
    )
  );
create policy "events insert own" on public.contract_events
  for insert with check (
    public.is_admin()
    or exists (
      select 1 from public.contracts ct
      where ct.id = contract_id
        and (
          ct.client_id = auth.uid()
          or ct.contact_id in (select public.my_contact_ids())
        )
    )
  );
create policy "events admin all" on public.contract_events
  for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.claim_my_records()
 returns table(applications integer, quotes integer, waitlist integer, contracts integer)
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_confirmed timestamptz;
  a integer := 0; q integer := 0; w integer := 0; c integer := 0;
begin
  if v_uid is null then
    return query select 0, 0, 0, 0;
    return;
  end if;

  select lower(u.email), u.email_confirmed_at
    into v_email, v_confirmed
    from auth.users u
   where u.id = v_uid;

  if v_email is null or v_confirmed is null then
    return query select 0, 0, 0, 0;
    return;
  end if;

  update public.applications
     set user_id = v_uid
   where user_id is null and lower(email) = v_email;
  get diagnostics a = row_count;

  update public.contacts
     set user_id = v_uid
   where id = (
     select ct.id from public.contacts ct
      where ct.user_id is null
        and ct.merged_into_contact_id is null
        and ct.email is not null
        and lower(trim(ct.email)) = v_email
      order by (ct.phone is not null)::int + (ct.address is not null)::int
             + (ct.city is not null)::int + (length(coalesce(ct.full_name,'')) > 0)::int desc,
               ct.created_at asc
      limit 1
   )
   and not exists (select 1 from public.contacts x where x.user_id = v_uid);

  update public.quotes qt
     set client_id = v_uid
   where qt.client_id is null
     and (
       qt.application_id in (
         select ap.id from public.applications ap where ap.user_id = v_uid
       )
       or qt.contact_id in (
         select ct.id from public.contacts ct
          where ct.email is not null
            and lower(trim(ct.email)) = v_email
       )
     );
  get diagnostics q = row_count;

  update public.invoices i
     set client_id = v_uid
   where i.client_id is null
     and i.quote_id in (
       select qt.id from public.quotes qt where qt.client_id = v_uid
     );

  update public.documents d
     set entity_type = 'client',
         entity_id = v_uid
   where d.entity_type in ('invoice', 'payment')
     and (
       d.related_invoice_id in (
         select i.id from public.invoices i where i.client_id = v_uid
       )
       or d.related_quote_id in (
         select qt.id from public.quotes qt where qt.client_id = v_uid
       )
     );

  update public.waiting_list
     set client_id = v_uid
   where client_id is null and lower(enquirer_email) = v_email;
  get diagnostics w = row_count;

  update public.contracts ct
     set client_id = v_uid
   where ct.client_id is null
     and (
       ct.contact_id in (select c.id from public.contacts c where c.user_id = v_uid)
       or ct.reservation_id in (
         select r.id from public.reservations r where r.client_id = v_uid
       )
     );
  get diagnostics c = row_count;

  return query select a, q, w, c;
end;
$function$;

grant execute on function public.claim_my_records() to public;
grant execute on function public.claim_my_records() to anon;
grant execute on function public.claim_my_records() to authenticated;
grant execute on function public.claim_my_records() to postgres;
grant execute on function public.claim_my_records() to service_role;

drop function if exists public.sign_contract_as_client(uuid, text, text, text);

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
  v_contact_id uuid;
  v_already_signed boolean;
  v_ok boolean;
begin
  select client_id, contact_id, signed_by_client
    into v_client_id, v_contact_id, v_already_signed
  from public.contracts
  where id = p_contract_id
  for update;

  if not found then
    raise exception 'Contract not found';
  end if;

  v_ok := (v_client_id is not null and v_client_id = auth.uid())
    or (v_contact_id is not null and v_contact_id in (select public.my_contact_ids()));
  if not v_ok then
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
    status = 'signed_client',
    client_id = coalesce(client_id, auth.uid())
  where id = p_contract_id;
end;
$$;

grant execute on function public.sign_contract_as_client(uuid, text, text, text) to authenticated;
