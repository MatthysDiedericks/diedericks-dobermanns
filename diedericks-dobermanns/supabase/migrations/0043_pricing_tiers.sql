-- Admin-managed price list. One row per product tier. Deliberately flat:
-- no per-dog overrides, no modifiers — exceptions are handled by editing the
-- quote by hand, which the quote builder already supports.
--
-- tier_key intentionally mirrors applications.dog_interest's check-constraint
-- values ('puppy' | 'elite_developed' | 'protection_dog') so an application can
-- be mapped to a price with a direct key lookup and no translation table.
create table if not exists pricing_tiers (
  id uuid primary key default gen_random_uuid(),
  tier_key text not null unique
    check (tier_key in ('puppy', 'elite_developed', 'protection_dog')),
  display_label text not null,
  description text,
  price numeric not null default 0 check (price >= 0),
  currency text not null default 'ZAR',
  -- When false the tier still prices quotes but its number is hidden on the
  -- public website (shows "Contact us" instead). Lets Matt take a tier off
  -- public display without deleting its price.
  is_public boolean not null default true,
  sort_order int not null default 0,
  updated_by uuid references users(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_pricing_tiers_sort on pricing_tiers (sort_order);

-- RLS: anyone (incl. anonymous website visitors) may READ; only admins write.
-- Public read is required — the website application form renders these prices
-- for logged-out visitors using the anon key.
alter table pricing_tiers enable row level security;

create policy "Anyone can view pricing tiers" on pricing_tiers
  for select using (true);

create policy "Admins can manage pricing tiers" on pricing_tiers
  for all using (is_admin()) with check (is_admin());

-- Seed the three tiers at 0.00 — Matt sets real prices in the admin screen.
-- Do NOT invent prices here.
insert into pricing_tiers (tier_key, display_label, description, price, sort_order)
values
  ('puppy',           'Standard Puppy',                 'Health-tested, temperament-evaluated puppy from a planned litter.', 0, 1),
  ('elite_developed', 'Elite Developed Puppy',          '8–16 week structured development programme included.',              0, 2),
  ('protection_dog',  'Fully Trained Protection Dog',   'Fully trained personal / family protection dog.',                   0, 3)
on conflict (tier_key) do nothing;

-- Keep updated_at honest.
create or replace function public.touch_pricing_tiers()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_pricing_tiers on pricing_tiers;
create trigger trg_touch_pricing_tiers
  before update on pricing_tiers
  for each row execute function public.touch_pricing_tiers();
