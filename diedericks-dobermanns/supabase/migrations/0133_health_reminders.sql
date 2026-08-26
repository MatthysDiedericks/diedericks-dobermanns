-- Owner-set health reminders. Clients read and write only their own rows.
-- Staff (is_trainer_or_above) may SELECT so Matt can see them on the dog
-- profile. Staff cannot INSERT/UPDATE/DELETE — these are the client's notes.
-- Nothing in this table sends email or WhatsApp.

create table if not exists public.health_reminders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.users(id) on delete cascade,
  dog_id uuid not null references public.dogs(id) on delete cascade,
  kind text not null check (kind in ('vaccination', 'deworming', 'vet_visit', 'other')),
  title text not null,
  due_date date not null,
  note text,
  is_done boolean not null default false,
  done_at timestamptz,
  created_at timestamptz not null default now(),
  created_by uuid not null references public.users(id)
);

create index if not exists idx_health_reminders_client_due
  on public.health_reminders (client_id, due_date)
  where is_done = false;

create index if not exists idx_health_reminders_dog
  on public.health_reminders (dog_id, due_date);

alter table public.health_reminders enable row level security;

drop policy if exists "health_reminders_select" on public.health_reminders;
create policy "health_reminders_select" on public.health_reminders
  for select using (
    client_id = auth.uid()
    or public.is_trainer_or_above()
  );

drop policy if exists "health_reminders_insert" on public.health_reminders;
create policy "health_reminders_insert" on public.health_reminders
  for insert with check (
    client_id = auth.uid()
    and created_by = auth.uid()
    and dog_id in (select public.dog_ids_for(auth.uid()))
  );

drop policy if exists "health_reminders_update" on public.health_reminders;
create policy "health_reminders_update" on public.health_reminders
  for update using (client_id = auth.uid())
  with check (client_id = auth.uid());

drop policy if exists "health_reminders_delete" on public.health_reminders;
create policy "health_reminders_delete" on public.health_reminders
  for delete using (client_id = auth.uid());

grant select, insert, update, delete on public.health_reminders to authenticated;
grant select on public.health_reminders to service_role;

-- Client vet paperwork lives on documents (no parallel table). Additive RLS
-- only — existing proof-of-payment and staff policies stay as they are.
drop policy if exists "Client can insert own health documents" on public.documents;
create policy "Client can insert own health documents" on public.documents
  for insert to authenticated
  with check (
    entity_type = 'health'
    and provided_by = 'client'
    and review_status = 'pending'
    and client_visible is true
    and coalesce(is_public, false) is false
    and category in ('vaccination_record', 'health_certificate', 'microchip', 'other')
    and uploaded_by = auth.uid()
    and entity_id in (select public.dog_ids_for(auth.uid()))
  );

drop policy if exists "Client can view own health documents" on public.documents;
create policy "Client can view own health documents" on public.documents
  for select to authenticated
  using (
    entity_type = 'health'
    and provided_by = 'client'
    and uploaded_by = auth.uid()
  );

drop policy if exists "Staff can review client health documents" on public.documents;
create policy "Staff can review client health documents" on public.documents
  for update to authenticated
  using (
    entity_type = 'health'
    and provided_by = 'client'
    and public.is_trainer_or_above()
  )
  with check (
    entity_type = 'health'
    and provided_by = 'client'
    and public.is_trainer_or_above()
  );
