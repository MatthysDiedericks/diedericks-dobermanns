-- 0142 — Additional users on a client portal (guests, not co-owners).
-- Widen lookup via my_client_ids(); do not move ownership. Never revoke
-- EXECUTE on my_client_ids / my_financial_client_ids — used inside RLS.

-- ---------------------------------------------------------------------------
-- Table
-- ---------------------------------------------------------------------------
create table public.portal_members (
  id uuid primary key default gen_random_uuid(),
  account_holder_id uuid not null references auth.users(id) on delete cascade,
  member_user_id uuid references auth.users(id) on delete cascade,
  invited_email text not null,
  full_name text not null,
  relationship text,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'revoked')),
  can_view_financials boolean not null default false,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index portal_members_holder_email_uniq
  on public.portal_members (account_holder_id, lower(invited_email));
create unique index portal_members_holder_member_uniq
  on public.portal_members (account_holder_id, member_user_id)
  where member_user_id is not null;
alter table public.portal_members
  add constraint portal_members_not_self
  check (member_user_id is null or member_user_id <> account_holder_id);

create index portal_members_member_active_idx
  on public.portal_members (member_user_id, status)
  where status = 'active';
create index portal_members_holder_idx
  on public.portal_members (account_holder_id);

create trigger portal_members_set_updated_at
  before update on public.portal_members
  for each row execute function public.set_updated_at();

create or replace function public.trg_portal_members_two_cap()
returns trigger
language plpgsql
set search_path to 'public', 'auth'
as $$
declare
  n int;
  holder_email text;
begin
  if new.status = 'revoked' then
    return new;
  end if;

  select lower(u.email) into holder_email
    from auth.users u
   where u.id = new.account_holder_id;
  if holder_email is not null and lower(btrim(new.invited_email)) = holder_email then
    raise exception 'You cannot add yourself to your own portal.';
  end if;

  select count(*)::int into n
    from public.portal_members m
   where m.account_holder_id = new.account_holder_id
     and m.status is distinct from 'revoked'
     and m.id is distinct from new.id;
  if n >= 2 then
    raise exception 'You can add at most two people to your portal.';
  end if;
  return new;
end;
$$;

create trigger trg_portal_members_two_cap
  before insert or update of status on public.portal_members
  for each row execute function public.trg_portal_members_two_cap();

alter table public.portal_members enable row level security;
revoke all on public.portal_members from anon, public;
grant select, insert, update on public.portal_members to authenticated;

drop policy if exists portal_members_holder_all on public.portal_members;
create policy portal_members_holder_all
  on public.portal_members
  for all
  using (account_holder_id = auth.uid())
  with check (account_holder_id = auth.uid());

drop policy if exists portal_members_member_select on public.portal_members;
create policy portal_members_member_select
  on public.portal_members
  for select
  using (member_user_id = auth.uid());

drop policy if exists portal_members_admin_all on public.portal_members;
create policy portal_members_admin_all
  on public.portal_members
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Lookup helpers. Grant, never revoke — used inside RLS.
-- ---------------------------------------------------------------------------
create or replace function public.my_client_ids()
returns setof uuid
language sql
stable
security definer
set search_path to 'public'
as $$
  select auth.uid()
  union
  select m.account_holder_id
    from public.portal_members m
   where m.member_user_id = auth.uid()
     and m.status = 'active'
$$;

create or replace function public.my_financial_client_ids()
returns setof uuid
language sql
stable
security definer
set search_path to 'public'
as $$
  select auth.uid()
  union
  select m.account_holder_id
    from public.portal_members m
   where m.member_user_id = auth.uid()
     and m.status = 'active'
     and m.can_view_financials
$$;

create or replace function public.my_guest_access()
returns table (
  membership_id uuid,
  account_holder_id uuid,
  holder_name text,
  can_view_financials boolean
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select m.id, m.account_holder_id, u.full_name, m.can_view_financials
    from public.portal_members m
    join public.users u on u.id = m.account_holder_id
   where m.member_user_id = auth.uid()
     and m.status = 'active'
$$;

grant execute on function public.my_client_ids() to authenticated, anon;
grant execute on function public.my_financial_client_ids() to authenticated, anon;
grant execute on function public.my_guest_access() to authenticated, anon;

-- ---------------------------------------------------------------------------
-- 2a. Widen helper functions at source
-- ---------------------------------------------------------------------------
create or replace function public.my_dog_ids()
returns setof uuid
language sql
stable
security definer
set search_path to 'public'
as $$
  select d.id
    from public.dogs d
   where d.owner_id in (select public.my_client_ids())
  union
  select r.dog_id
    from public.reservations r
   where r.client_id in (select public.my_client_ids())
     and r.status in ('confirmed', 'completed')
     and r.dog_id is not null
  union
  select wl.assigned_dog_id
    from public.waiting_list wl
   where wl.client_id in (select public.my_client_ids())
     and wl.assigned_dog_id is not null
     and wl.status = 'active'
     and wl.pipeline_stage is distinct from 'withdrawn'
$$;

create or replace function public.my_contact_ids()
returns setof uuid
language sql
stable
security definer
set search_path to 'public'
as $$
  select c.id from public.contacts c
   where c.user_id in (select public.my_client_ids())
$$;

create or replace function public.my_dog_parent_ids()
returns setof uuid
language sql
stable
security definer
set search_path to 'public'
as $$
  select public.parent_ids_for(cid) from public.my_client_ids() as cid
$$;

grant execute on function public.my_dog_ids() to authenticated, anon;
grant execute on function public.my_contact_ids() to authenticated, anon, service_role;
grant execute on function public.my_dog_parent_ids() to authenticated, service_role;

-- Parameterised helpers keep ownership on p_user_id. Widen only the caller
-- guard so a guest may ask for their holder's set (admin preview unchanged).
create or replace function public.dog_ids_for(p_user_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path to 'public'
as $$
  select d.id
    from public.dogs d
   where p_user_id is not null
     and (public.is_admin() or p_user_id in (select public.my_client_ids()))
     and d.owner_id = p_user_id
  union
  select r.dog_id
    from public.reservations r
   where p_user_id is not null
     and (public.is_admin() or p_user_id in (select public.my_client_ids()))
     and r.client_id = p_user_id
     and r.dog_id is not null
     and r.status in ('confirmed', 'completed')
  union
  select wl.assigned_dog_id
    from public.waiting_list wl
   where p_user_id is not null
     and (public.is_admin() or p_user_id in (select public.my_client_ids()))
     and wl.client_id = p_user_id
     and wl.assigned_dog_id is not null
     and wl.status = 'active'
     and wl.pipeline_stage is distinct from 'withdrawn'
$$;

create or replace function public.parent_links_for(p_user_id uuid)
returns table(parent_id uuid, role text, source text)
language sql
stable
security definer
set search_path to 'public'
as $$
  select coalesce(d.mother_id, l.mother_id), 'dam'::text, 'dog'::text
    from public.dogs d
    left join public.litters l on l.id = d.litter_id
   where p_user_id is not null
     and (public.is_admin() or p_user_id in (select public.my_client_ids()))
     and d.id in (select public.dog_ids_for(p_user_id))
     and coalesce(d.mother_id, l.mother_id) is not null
  union
  select coalesce(d.father_id, l.father_id), 'sire'::text, 'dog'::text
    from public.dogs d
    left join public.litters l on l.id = d.litter_id
   where p_user_id is not null
     and (public.is_admin() or p_user_id in (select public.my_client_ids()))
     and d.id in (select public.dog_ids_for(p_user_id))
     and coalesce(d.father_id, l.father_id) is not null
  union
  select lit.mother_id, 'dam'::text, 'litter'::text
    from public.waiting_list wl
    join public.litters lit on lit.id = wl.assigned_litter_id
   where p_user_id is not null
     and (public.is_admin() or p_user_id in (select public.my_client_ids()))
     and wl.client_id = p_user_id
     and wl.assigned_litter_id is not null
     and wl.status = 'active'
     and wl.pipeline_stage is distinct from 'withdrawn'
     and lit.mother_id is not null
  union
  select lit.father_id, 'sire'::text, 'litter'::text
    from public.waiting_list wl
    join public.litters lit on lit.id = wl.assigned_litter_id
   where p_user_id is not null
     and (public.is_admin() or p_user_id in (select public.my_client_ids()))
     and wl.client_id = p_user_id
     and wl.assigned_litter_id is not null
     and wl.status = 'active'
     and wl.pipeline_stage is distinct from 'withdrawn'
     and lit.father_id is not null
$$;

create or replace function public.assigned_litter_for(p_user_id uuid)
returns table(
  litter_id uuid,
  expected_date date,
  actual_date date,
  go_home_date date,
  go_home_earliest date,
  go_home_latest date,
  go_home_weeks integer,
  mother_id uuid,
  father_id uuid
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select lit.id,
         lit.expected_date,
         lit.actual_date,
         lit.go_home_date,
         lit.go_home_earliest,
         lit.go_home_latest,
         lit.go_home_weeks,
         lit.mother_id,
         lit.father_id
    from public.waiting_list wl
    join public.litters lit on lit.id = wl.assigned_litter_id
   where p_user_id is not null
     and (public.is_admin() or p_user_id in (select public.my_client_ids()))
     and wl.client_id = p_user_id
     and wl.assigned_litter_id is not null
     and wl.status = 'active'
     and wl.pipeline_stage is distinct from 'withdrawn'
   order by wl.stage_updated_at desc nulls last, wl.created_at desc
   limit 1
$$;

create or replace function public.document_ids_visible_to(p_user_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path to 'public'
as $$
  select d.id
    from public.documents d
   where p_user_id is not null
     and (public.is_admin() or p_user_id in (select public.my_client_ids()))
     and (
       (d.entity_type = 'client' and d.entity_id = p_user_id)
       or (d.allowed_user_ids is not null and p_user_id = any (d.allowed_user_ids))
       or (
         d.entity_id in (select public.dog_ids_for(p_user_id))
         and d.client_visible is true
       )
       or (
         d.entity_type = 'dog'
         and d.entity_id in (select public.parent_ids_for(p_user_id))
         and d.category in ('dna_test', 'hip_elbow_score', 'pedigree', 'registration')
       )
       or (
         d.client_visible is true
         and d.entity_type is distinct from 'dog'
       )
     )
$$;

grant execute on function public.dog_ids_for(uuid) to authenticated, service_role;
grant execute on function public.parent_links_for(uuid) to authenticated, service_role;
grant execute on function public.assigned_litter_for(uuid) to authenticated, service_role;
grant execute on function public.document_ids_visible_to(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2b. Policies that compared auth.uid() directly
-- ---------------------------------------------------------------------------
drop policy if exists "dogs owner read" on public.dogs;
create policy "dogs owner read" on public.dogs
  for select using (owner_id in (select public.my_client_ids()));

drop policy if exists "Clients can view reserved dogs" on public.dogs;
create policy "Clients can view reserved dogs" on public.dogs
  for select using (
    exists (
      select 1 from public.reservations r
      where r.dog_id = dogs.id
        and r.client_id in (select public.my_client_ids())
        and r.status in ('confirmed', 'completed')
    )
  );

drop policy if exists "Owners/reservers can view dog media" on public.dog_media;
create policy "Owners/reservers can view dog media" on public.dog_media
  for select using (
    exists (
      select 1 from public.dogs d
      where d.id = dog_media.dog_id
        and (
          d.owner_id in (select public.my_client_ids())
          or exists (
            select 1 from public.reservations r
            where r.dog_id = d.id
              and r.client_id in (select public.my_client_ids())
              and r.status in ('confirmed', 'completed')
          )
        )
    )
  );

-- uploaded_by stays auth.uid() — the real actor, never the holder.
drop policy if exists "Owners can insert own dog media" on public.dog_media;
create policy "Owners can insert own dog media" on public.dog_media
  for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and is_public = false
    and client_consent = false
    and approved_by is null
    and approved_at is null
    and dog_id in (select public.my_dog_ids())
    and exists (
      select 1 from public.owner_photo_window(dog_id) w
      where w.can_upload = true
        and w.photos_in_window < 3
    )
  );

drop policy if exists "Owners can add media to their own dog" on public.dog_media;
create policy "Owners can add media to their own dog" on public.dog_media
  for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and dog_id in (select public.my_dog_ids())
  );

drop policy if exists "Clients can view own dog vaccinations" on public.vaccinations;
create policy "Clients can view own dog vaccinations" on public.vaccinations
  for select using (
    exists (
      select 1 from public.reservations r
      where r.dog_id = vaccinations.dog_id
        and r.client_id in (select public.my_client_ids())
    )
  );

drop policy if exists "vaccinations read" on public.vaccinations;
create policy "vaccinations read" on public.vaccinations
  for select using (
    public.is_trainer_or_above()
    or exists (
      select 1 from public.reservations r
      where r.dog_id = vaccinations.dog_id
        and r.client_id in (select public.my_client_ids())
    )
    or exists (
      select 1 from public.dogs d
      where d.id = vaccinations.dog_id
        and d.owner_id in (select public.my_client_ids())
    )
  );

drop policy if exists "Clients can view own reservations" on public.reservations;
create policy "Clients can view own reservations" on public.reservations
  for select using (client_id in (select public.my_client_ids()));

drop policy if exists "Client can view own waiting list entry" on public.waiting_list;
create policy "Client can view own waiting list entry" on public.waiting_list
  for select using (client_id in (select public.my_client_ids()));

drop policy if exists "client own dog notes" on public.client_dog_notes;
create policy "client own dog notes" on public.client_dog_notes
  for all
  using (client_id in (select public.my_client_ids()))
  with check (client_id in (select public.my_client_ids()));

-- Health paperwork: widen visibility of rows the household uploaded.
-- uploaded_by still records the actor (see insert policies, unchanged).
drop policy if exists "Client can view own health documents" on public.documents;
create policy "Client can view own health documents" on public.documents
  for select to authenticated
  using (
    entity_type = 'health'
    and provided_by = 'client'
    and uploaded_by in (select public.my_client_ids())
  );

drop policy if exists "Client can view own health paperwork" on public.documents;
create policy "Client can view own health paperwork" on public.documents
  for select using (
    entity_type = 'health'
    and provided_by = 'client'
    and uploaded_by in (select public.my_client_ids())
  );

-- ---------------------------------------------------------------------------
-- 2c. Financial — gated on can_view_financials
-- ---------------------------------------------------------------------------
drop policy if exists "Client can view own invoices" on public.invoices;
drop policy if exists "invoices read own" on public.invoices;
create policy "Client can view own invoices" on public.invoices
  for select using (client_id in (select public.my_financial_client_ids()));

drop policy if exists "invoice_items read own" on public.invoice_items;
create policy "invoice_items read own" on public.invoice_items
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.invoices i
      where i.id = invoice_items.invoice_id
        and i.client_id in (select public.my_financial_client_ids())
    )
  );

drop policy if exists "payments client read own" on public.payments;
create policy "payments client read own" on public.payments
  for select using (
    client_id in (select public.my_financial_client_ids())
    or exists (
      select 1 from public.invoices i
      where i.id = payments.invoice_id
        and i.client_id in (select public.my_financial_client_ids())
    )
  );

drop policy if exists "Client can view own quotes" on public.quotes;
create policy "Client can view own quotes" on public.quotes
  for select using (client_id in (select public.my_financial_client_ids()));

drop policy if exists "Client can view application-linked quotes" on public.quotes;
create policy "Client can view application-linked quotes" on public.quotes
  for select using (
    exists (
      select 1 from public.applications a
      where a.id = quotes.application_id
        and a.user_id in (select public.my_financial_client_ids())
    )
  );

drop policy if exists "Client can view own quote items" on public.quote_items;
drop policy if exists "quote_items read own" on public.quote_items;
create policy "Client can view own quote items" on public.quote_items
  for select using (
    exists (
      select 1 from public.quotes q
      where q.id = quote_items.quote_id
        and q.client_id in (select public.my_financial_client_ids())
    )
  );

drop policy if exists "Client can view application-linked quote items" on public.quote_items;
create policy "Client can view application-linked quote items" on public.quote_items
  for select using (
    exists (
      select 1 from public.quotes q
      join public.applications a on a.id = q.application_id
      where q.id = quote_items.quote_id
        and a.user_id in (select public.my_financial_client_ids())
    )
  );

drop policy if exists "Client can view own proof of payment" on public.documents;
create policy "Client can view own proof of payment" on public.documents
  for select using (
    category = 'proof_of_payment'
    and entity_type = 'client'
    and entity_id in (select public.my_financial_client_ids())
  );

-- Contract SELECT is financial (it carries the purchase price).
-- Sign / acknowledge stay on auth.uid() — inlined, not my_contact_ids().
drop policy if exists "contracts read own" on public.contracts;
create policy "contracts read own" on public.contracts
  for select using (
    public.is_admin()
    or client_id in (select public.my_financial_client_ids())
    or contact_id in (
      select c.id from public.contacts c
      where c.user_id in (select public.my_financial_client_ids())
    )
  );

drop policy if exists "contracts client sign" on public.contracts;
create policy "contracts client sign" on public.contracts
  for update using (
    client_id = auth.uid()
    or contact_id in (select c.id from public.contacts c where c.user_id = auth.uid())
  ) with check (
    client_id = auth.uid()
    or contact_id in (select c.id from public.contacts c where c.user_id = auth.uid())
  );

drop policy if exists "acks read own" on public.contract_acknowledgements;
create policy "acks read own" on public.contract_acknowledgements
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.contracts ct
      where ct.id = contract_id
        and (
          ct.client_id in (select public.my_financial_client_ids())
          or ct.contact_id in (
            select c.id from public.contacts c
            where c.user_id in (select public.my_financial_client_ids())
          )
        )
    )
  );

drop policy if exists "acks insert own" on public.contract_acknowledgements;
create policy "acks insert own" on public.contract_acknowledgements
  for insert with check (
    public.is_admin()
    or exists (
      select 1 from public.contracts ct
      where ct.id = contract_id
        and (
          ct.client_id = auth.uid()
          or ct.contact_id in (select c.id from public.contacts c where c.user_id = auth.uid())
        )
    )
  );

drop policy if exists "events read own" on public.contract_events;
create policy "events read own" on public.contract_events
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.contracts ct
      where ct.id = contract_id
        and (
          ct.client_id in (select public.my_financial_client_ids())
          or ct.contact_id in (
            select c.id from public.contacts c
            where c.user_id in (select public.my_financial_client_ids())
          )
        )
    )
  );

drop policy if exists "events insert own" on public.contract_events;
create policy "events insert own" on public.contract_events
  for insert with check (
    public.is_admin()
    or exists (
      select 1 from public.contracts ct
      where ct.id = contract_id
        and (
          ct.client_id = auth.uid()
          or ct.contact_id in (select c.id from public.contacts c where c.user_id = auth.uid())
        )
    )
  );

-- ---------------------------------------------------------------------------
-- Invite source + activate membership on redeem
-- ---------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select c.conname
      from pg_constraint c
     where c.conrelid = 'public.portal_invites'::regclass
       and c.contype = 'c'
       and pg_get_constraintdef(c.oid) ilike '%source%'
  loop
    execute format('alter table public.portal_invites drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.portal_invites
  add constraint portal_invites_source_check
  check (source in ('application', 'waiting_list', 'client', 'member'));

create or replace function public.mark_portal_invite_opened()
returns void
language plpgsql
security definer
set search_path to 'public', 'auth'
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
begin
  if v_uid is null then
    return;
  end if;
  select lower(u.email) into v_email from auth.users u where u.id = v_uid;
  update public.portal_invites
     set opened_at = coalesce(opened_at, now())
   where opened_at is null
     and (user_id = v_uid or email = v_email);

  update public.portal_members m
     set member_user_id = v_uid,
         accepted_at = coalesce(m.accepted_at, now()),
         status = 'active',
         updated_at = now()
   where m.status = 'pending'
     and lower(btrim(m.invited_email)) = v_email
     and exists (
       select 1 from public.portal_invites i
        where i.source = 'member'
          and i.source_id = m.id
          and (i.user_id = v_uid or lower(i.email) = v_email)
     );
end;
$$;

grant execute on function public.mark_portal_invite_opened() to authenticated;
