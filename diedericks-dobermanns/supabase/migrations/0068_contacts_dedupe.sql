-- 0068_contacts_dedupe -- Contact de-duplication, E.164 phones, merge soft-delete.
-- Renamed from 0059_contacts_dedupe to avoid colliding with 0059_breeding_cycle_capture (already applied).
-- Folds in the source_ref unique index applied by hand on 11 Aug 2026.

-- Records the partial unique index applied by hand on 11 Aug 2026.
create unique index if not exists contacts_source_ref_key
  on public.contacts (source_ref) where source_ref is not null;

-- Also keep the name used by an earlier draft migration, if present.
create unique index if not exists contacts_source_ref_uidx
  on public.contacts (source_ref) where source_ref is not null;

alter table public.contacts
  drop constraint if exists contacts_source_check;

alter table public.contacts
  add constraint contacts_source_check
  check (
    source is null
    or source in (
      'manual', 'app_signup', 'enquiry', 'referral', 'import', 'dogbreederpro'
    )
  );

alter table public.contacts
  add column if not exists phone_e164 text,
  add column if not exists whatsapp_e164 text,
  add column if not exists merged_into_contact_id uuid references public.contacts(id) on delete set null,
  add column if not exists merged_at timestamptz,
  add column if not exists merged_by uuid references auth.users(id);

create index if not exists contacts_phone_e164_idx
  on public.contacts (phone_e164) where phone_e164 is not null;

create index if not exists contacts_merged_idx
  on public.contacts (merged_into_contact_id) where merged_into_contact_id is not null;

do $$ begin
  if not exists (
    select 1 from pg_constraint where conname = 'contacts_no_self_merge'
  ) then
    alter table public.contacts
      add constraint contacts_no_self_merge
      check (merged_into_contact_id is null or merged_into_contact_id <> id);
  end if;
end $$;

-- Active contacts only — every list/picker should read this (or filter equivalently).
create or replace view public.contacts_active as
select *
from public.contacts
where merged_into_contact_id is null;

grant select on public.contacts_active to authenticated, anon, service_role;

create table if not exists public.contact_duplicate_candidates (
  id            uuid primary key default gen_random_uuid(),
  contact_a_id  uuid not null references public.contacts(id) on delete cascade,
  contact_b_id  uuid not null references public.contacts(id) on delete cascade,
  match_reason  text not null,
  match_detail  text,
  confidence    text not null check (confidence in ('high', 'medium', 'low')),
  status        text not null default 'open'
                  check (status in ('open', 'merged', 'not_duplicates')),
  resolved_by   uuid references auth.users(id),
  resolved_at   timestamptz,
  created_at    timestamptz not null default now(),
  constraint contact_dupe_ordered check (contact_a_id < contact_b_id)
);

create unique index if not exists contact_duplicate_pair_key
  on public.contact_duplicate_candidates (contact_a_id, contact_b_id);

alter table public.contact_duplicate_candidates enable row level security;

drop policy if exists "Admins manage contact duplicate candidates"
  on public.contact_duplicate_candidates;
create policy "Admins manage contact duplicate candidates"
  on public.contact_duplicate_candidates
  for all
  using (public.is_admin())
  with check (public.is_admin());

select public.enable_audit('contact_duplicate_candidates');
-- contacts already audited; re-call is a no-op if already attached.
select public.enable_audit('contacts');

/**
 * Merge loser into survivor. Never deletes. Re-points every FK that references
 * public.contacts, fills empty survivor fields, unions tags, takes most
 * restrictive consent flags.
 */
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

  -- Re-point every FK referencing contacts(id), except self-merge columns.
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
