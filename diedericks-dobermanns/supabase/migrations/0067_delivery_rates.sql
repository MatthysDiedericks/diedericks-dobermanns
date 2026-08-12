-- 0067 — Admin-managed delivery rate presets for quote line items.
-- Separate from pricing_tiers (those are dog programmes with a hard tier_key check).
-- Seeded empty on purpose — inventing a delivery amount that goes on a client
-- quote is worse than an empty dropdown.

create table if not exists public.delivery_rates (
  id          uuid primary key default gen_random_uuid(),
  label       text not null,
  amount      numeric not null default 0 check (amount >= 0),
  notes       text,
  active      boolean not null default true,
  sort_order  int not null default 0,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists delivery_rates_active_sort_idx
  on public.delivery_rates (active, sort_order);

comment on table public.delivery_rates is
  'Admin-managed delivery / travel presets offered when a quote line type is delivery.';

alter table public.delivery_rates enable row level security;

drop policy if exists delivery_rates_select_admin on public.delivery_rates;
create policy delivery_rates_select_admin on public.delivery_rates
  for select to authenticated
  using (public.is_admin());

drop policy if exists delivery_rates_insert_admin on public.delivery_rates;
create policy delivery_rates_insert_admin on public.delivery_rates
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists delivery_rates_update_admin on public.delivery_rates;
create policy delivery_rates_update_admin on public.delivery_rates
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists delivery_rates_delete_admin on public.delivery_rates;
create policy delivery_rates_delete_admin on public.delivery_rates
  for delete to authenticated
  using (public.is_admin());

grant select, insert, update, delete on public.delivery_rates to authenticated;

create or replace function public.touch_delivery_rates()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_delivery_rates on public.delivery_rates;
create trigger trg_touch_delivery_rates
  before update on public.delivery_rates
  for each row execute function public.touch_delivery_rates();

select public.enable_audit('delivery_rates');
