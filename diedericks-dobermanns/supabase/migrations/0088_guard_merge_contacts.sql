-- Admin-only guard on merge_contacts. Body otherwise matches live 18 Aug 2026.

create or replace function public.merge_contacts(
  p_survivor_id uuid,
  p_loser_id uuid,
  p_actor_id uuid default auth.uid()
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r_surv public.contacts%rowtype;
  r_lose public.contacts%rowtype;
  rec record;
  note_bits text[] := array[]::text[];
begin
  if not public.is_admin() then
    raise exception 'admin only' using errcode = '42501';
  end if;

  if p_survivor_id = p_loser_id then
    raise exception 'Cannot merge a contact into itself';
  end if;

  select * into r_surv from public.contacts where id = p_survivor_id for update;
  select * into r_lose from public.contacts where id = p_loser_id for update;

  if r_surv.id is null or r_lose.id is null then
    raise exception 'Contact not found';
  end if;
  if r_surv.merged_into_contact_id is not null then
    raise exception 'Survivor is already merged';
  end if;
  if r_lose.merged_into_contact_id is not null then
    raise exception 'Loser is already merged';
  end if;

  -- Fill empty survivor fields; never overwrite populated ones.
  if r_surv.email is null and r_lose.email is not null then
    r_surv.email := r_lose.email;
  elsif r_lose.email is not null and r_surv.email is distinct from r_lose.email then
    note_bits := note_bits || ('Also recorded as email: ' || r_lose.email);
  end if;

  if r_surv.phone is null and r_lose.phone is not null then
    r_surv.phone := r_lose.phone;
    r_surv.phone_e164 := coalesce(r_surv.phone_e164, r_lose.phone_e164);
  elsif r_lose.phone is not null and r_surv.phone is distinct from r_lose.phone then
    note_bits := note_bits || ('Also recorded as phone: ' || r_lose.phone);
  end if;

  if r_surv.whatsapp_number is null and r_lose.whatsapp_number is not null then
    r_surv.whatsapp_number := r_lose.whatsapp_number;
    r_surv.whatsapp_e164 := coalesce(r_surv.whatsapp_e164, r_lose.whatsapp_e164);
  elsif r_lose.whatsapp_number is not null
    and r_surv.whatsapp_number is distinct from r_lose.whatsapp_number then
    note_bits := note_bits || ('Also recorded as WhatsApp: ' || r_lose.whatsapp_number);
  end if;

  if r_surv.address is null and r_lose.address is not null then
    r_surv.address := r_lose.address;
  elsif r_lose.address is not null and r_surv.address is distinct from r_lose.address then
    note_bits := note_bits || ('Also recorded as address: ' || r_lose.address);
  end if;

  if r_surv.city is null and r_lose.city is not null then r_surv.city := r_lose.city; end if;
  if r_surv.country is null and r_lose.country is not null then r_surv.country := r_lose.country; end if;
  if r_surv.company is null and r_lose.company is not null then r_surv.company := r_lose.company; end if;
  if r_surv.id_number is null and r_lose.id_number is not null then r_surv.id_number := r_lose.id_number; end if;
  if r_surv.user_id is null and r_lose.user_id is not null then r_surv.user_id := r_lose.user_id; end if;
  if (r_surv.full_name is null or btrim(r_surv.full_name) = '' or lower(r_surv.full_name) = 'unnamed contact')
     and r_lose.full_name is not null and lower(r_lose.full_name) <> 'unnamed contact' then
    r_surv.full_name := r_lose.full_name;
  elsif r_lose.full_name is not null
    and lower(r_surv.full_name) is distinct from lower(r_lose.full_name)
    and lower(r_lose.full_name) <> 'unnamed contact' then
    note_bits := note_bits || ('Also recorded as: ' || r_lose.full_name);
  end if;

  r_surv.tags := (
    select coalesce(array_agg(distinct t), '{}')
    from unnest(coalesce(r_surv.tags, '{}') || coalesce(r_lose.tags, '{}')) as t
  );

  -- Most restrictive consent wins.
  r_surv.marketing_opt_in := coalesce(r_surv.marketing_opt_in, false)
    and coalesce(r_lose.marketing_opt_in, false);
  r_surv.popia_consent := coalesce(r_surv.popia_consent, false)
    and coalesce(r_lose.popia_consent, false);
  if r_surv.popia_consent then
    r_surv.popia_consent_date := coalesce(r_surv.popia_consent_date, r_lose.popia_consent_date);
  end if;

  if r_lose.notes is not null and btrim(r_lose.notes) <> '' then
    note_bits := note_bits || ('Merged notes: ' || r_lose.notes);
  end if;
  if array_length(note_bits, 1) is not null then
    r_surv.notes := nullif(
      concat_ws(E'\n', nullif(r_surv.notes, ''), array_to_string(note_bits, E'\n')),
      ''
    );
  end if;

  update public.contacts set
    full_name = r_surv.full_name,
    email = r_surv.email,
    phone = r_surv.phone,
    phone_e164 = r_surv.phone_e164,
    whatsapp_number = r_surv.whatsapp_number,
    whatsapp_e164 = r_surv.whatsapp_e164,
    address = r_surv.address,
    city = r_surv.city,
    country = r_surv.country,
    company = r_surv.company,
    id_number = r_surv.id_number,
    user_id = r_surv.user_id,
    tags = r_surv.tags,
    marketing_opt_in = r_surv.marketing_opt_in,
    popia_consent = r_surv.popia_consent,
    popia_consent_date = r_surv.popia_consent_date,
    notes = r_surv.notes,
    updated_at = now()
  where id = p_survivor_id;

  -- Re-point every FK referencing contacts(id), except:
  --   * contacts.merged_into_contact_id (set below)
  --   * contact_duplicate_candidates (handled explicitly; re-pointing a/b
  --     violates contact_dupe_ordered when both sides become the survivor)
  for rec in
    select
      c.conrelid::regclass as tbl,
      a.attname as col
    from pg_constraint c
    join pg_attribute a
      on a.attrelid = c.conrelid and a.attnum = any (c.conkey) and not a.attisdropped
    join pg_attribute a_ref
      on a_ref.attrelid = c.confrelid and a_ref.attnum = any (c.confkey) and not a_ref.attisdropped
    where c.contype = 'f'
      and c.confrelid = 'public.contacts'::regclass
      and a_ref.attname = 'id'
      and not (c.conrelid = 'public.contacts'::regclass and a.attname = 'merged_into_contact_id')
      and c.conrelid <> 'public.contact_duplicate_candidates'::regclass
  loop
    execute format(
      'update %s set %I = $1 where %I = $2',
      rec.tbl, rec.col, rec.col
    ) using p_survivor_id, p_loser_id;
  end loop;

  update public.contacts set
    merged_into_contact_id = p_survivor_id,
    merged_at = now(),
    merged_by = p_actor_id,
    updated_at = now()
  where id = p_loser_id;

  update public.contact_duplicate_candidates
  set status = 'merged', resolved_by = p_actor_id, resolved_at = now()
  where status = 'open'
    and (
      (contact_a_id = p_survivor_id and contact_b_id = p_loser_id)
      or (contact_a_id = p_loser_id and contact_b_id = p_survivor_id)
      or contact_a_id = p_loser_id
      or contact_b_id = p_loser_id
    );
end;
$$;

revoke all on function public.merge_contacts(uuid, uuid, uuid) from public;
grant execute on function public.merge_contacts(uuid, uuid, uuid) to authenticated, service_role;
