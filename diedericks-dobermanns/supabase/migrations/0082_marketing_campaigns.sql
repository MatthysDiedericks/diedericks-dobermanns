-- 0082 — Campaigns, recipients, and public marketing pages.
-- Sending is always an explicit admin action in the website. No cron.

create table if not exists public.marketing_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  body_html text not null,
  published_at timestamptz,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text not null,
  body_html text not null,
  audience text not null check (audience in ('customers', 'subscribers', 'both')),
  status text not null default 'draft'
    check (status in ('draft', 'ready', 'sending', 'sent', 'cancelled')),
  page_id uuid references public.marketing_pages(id) on delete set null,
  scheduled_for timestamptz,
  sent_at timestamptz,
  recipient_count integer,
  created_by uuid references public.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.campaign_recipients (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  email text not null,
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'failed', 'skipped')),
  reason text,
  sent_at timestamptz,
  unique (campaign_id, contact_id)
);

create index if not exists campaigns_status_idx on public.campaigns(status, created_at desc);
create index if not exists campaign_recipients_campaign_idx
  on public.campaign_recipients(campaign_id, status);
create index if not exists marketing_pages_slug_idx
  on public.marketing_pages(slug) where published_at is not null;

alter table public.campaigns enable row level security;
alter table public.campaign_recipients enable row level security;
alter table public.marketing_pages enable row level security;

drop policy if exists "Admins manage campaigns" on public.campaigns;
create policy "Admins manage campaigns" on public.campaigns
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Admins manage campaign recipients" on public.campaign_recipients;
create policy "Admins manage campaign recipients" on public.campaign_recipients
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "Public read published marketing pages" on public.marketing_pages;
create policy "Public read published marketing pages" on public.marketing_pages
  for select using (published_at is not null or public.is_admin());

drop policy if exists "Admins manage marketing pages" on public.marketing_pages;
create policy "Admins manage marketing pages" on public.marketing_pages
  for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.touch_campaigns()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;
drop trigger if exists trg_touch_campaigns on public.campaigns;
create trigger trg_touch_campaigns
  before update on public.campaigns
  for each row execute function public.touch_campaigns();

create or replace function public.touch_marketing_pages()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;
drop trigger if exists trg_touch_marketing_pages on public.marketing_pages;
create trigger trg_touch_marketing_pages
  before update on public.marketing_pages
  for each row execute function public.touch_marketing_pages();

select public.enable_audit('campaigns');
select public.enable_audit('campaign_recipients');
select public.enable_audit('marketing_pages');
select public.enable_audit('contacts');
