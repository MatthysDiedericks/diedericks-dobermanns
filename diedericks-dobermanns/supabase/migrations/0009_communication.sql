-- ============================================================================
-- Diedericks Dobermanns — Client Communication & Social Hub
-- Reconciled to match the live Supabase schema (source of truth):
--   * app_settings is a key/value store (social links + contact details).
--   * client_groups carries colour/created_by/description/member_count.
--   * client_group_members can pin a dog_id / litter_id.
--   * broadcast_messages tracks sent_by + recipient_count.
--   * broadcast_reads gives per-client read tracking (app-side feature).
-- ============================================================================

-- Key/value settings store for social / contact links (publicly readable).
create table if not exists public.app_settings (
  key text primary key,
  value text,
  description text,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value, description) values
  ('social_whatsapp', null, 'WhatsApp contact number (1-on-1 chats)'),
  ('whatsapp_community_url', null, 'WhatsApp community invite link'),
  ('social_telegram', null, 'Telegram channel URL'),
  ('social_facebook', null, 'Facebook page URL'),
  ('social_instagram', null, 'Instagram profile URL'),
  ('social_youtube', null, 'YouTube channel URL')
on conflict (key) do nothing;

alter table public.app_settings enable row level security;
create policy "settings public read" on public.app_settings for select using (true);
create policy "settings admin write" on public.app_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- Client groups -------------------------------------------------------------
create table if not exists public.client_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'custom'
    check (type in ('litter', 'training', 'custom', 'all_clients')),
  description text,
  colour text,
  litter_id uuid references public.litters (id) on delete set null,
  member_count integer default 0,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.client_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.client_groups (id) on delete cascade,
  client_id uuid not null references public.users (id) on delete cascade,
  dog_id uuid references public.dogs (id) on delete set null,
  litter_id uuid references public.litters (id) on delete set null,
  added_at timestamptz not null default now(),
  unique (group_id, client_id)
);

create index if not exists idx_group_members_group on public.client_group_members (group_id);
create index if not exists idx_group_members_client on public.client_group_members (client_id);

alter table public.client_groups enable row level security;
alter table public.client_group_members enable row level security;

create policy "groups admin" on public.client_groups
  for all using (public.is_admin()) with check (public.is_admin());
create policy "group members admin" on public.client_group_members
  for all using (public.is_admin()) with check (public.is_admin());
-- A client may see which groups they belong to.
create policy "group members read own" on public.client_group_members
  for select using (client_id = auth.uid() or public.is_admin());

-- Broadcast messages --------------------------------------------------------
create table if not exists public.broadcast_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references public.client_groups (id) on delete set null,
  title text not null,
  body text not null,
  image_url text,
  channels text[] not null default '{push}',
  status text not null default 'sent' check (status in ('draft', 'scheduled', 'sent')),
  scheduled_for timestamptz,
  sent_at timestamptz,
  sent_by uuid references public.users (id) on delete set null,
  recipient_count integer,
  created_at timestamptz not null default now()
);

create table if not exists public.broadcast_reads (
  id uuid primary key default gen_random_uuid(),
  broadcast_id uuid not null references public.broadcast_messages (id) on delete cascade,
  client_id uuid not null references public.users (id) on delete cascade,
  read_at timestamptz not null default now(),
  unique (broadcast_id, client_id)
);

alter table public.broadcast_messages enable row level security;
alter table public.broadcast_reads enable row level security;

create policy "broadcasts admin" on public.broadcast_messages
  for all using (public.is_admin()) with check (public.is_admin());
-- A client may read broadcasts targeting a group they belong to (or untargeted).
create policy "broadcasts read for members" on public.broadcast_messages
  for select using (
    public.is_admin()
    or group_id is null
    or exists (
      select 1 from public.client_group_members m
      where m.group_id = broadcast_messages.group_id and m.client_id = auth.uid()
    )
  );

create policy "broadcast reads own" on public.broadcast_reads
  for all using (client_id = auth.uid() or public.is_admin())
  with check (client_id = auth.uid());

-- Auto-assign a confirmed client to their litter's group --------------------
-- When a reservation becomes confirmed, ensure a group exists for that litter
-- and add the reserving client as a member. Litter groups are identified by
-- type = 'litter' (no separate is_auto flag in the live schema).
create or replace function public.assign_litter_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_group_id uuid;
  v_litter_id uuid;
begin
  v_litter_id := new.litter_id;
  if v_litter_id is null or new.status is distinct from 'confirmed' then
    return new;
  end if;

  select id into v_group_id from public.client_groups
    where litter_id = v_litter_id and type = 'litter' limit 1;

  if v_group_id is null then
    insert into public.client_groups (name, type, litter_id)
    values (
      coalesce((select 'Litter — ' || name from public.litters where id = v_litter_id), 'Litter Group'),
      'litter', v_litter_id
    )
    returning id into v_group_id;
  end if;

  insert into public.client_group_members (group_id, client_id, litter_id)
  values (v_group_id, new.client_id, v_litter_id)
  on conflict (group_id, client_id) do nothing;

  update public.client_groups
    set member_count = (select count(*) from public.client_group_members where group_id = v_group_id)
    where id = v_group_id;

  return new;
end;
$$;

drop trigger if exists trg_assign_litter_group on public.reservations;
create trigger trg_assign_litter_group
  after insert or update of status on public.reservations
  for each row execute function public.assign_litter_group();
