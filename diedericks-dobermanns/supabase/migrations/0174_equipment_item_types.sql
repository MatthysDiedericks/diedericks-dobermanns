-- 0174_equipment_item_types.sql
-- The shop had no product type: every physical item was category 'accessory'.
-- Lookup table + FK so a wrong value is impossible and the list can grow
-- without a deploy.
--
-- 0170 is already employees_and_payslips; 0171–0173 are taken. Next free
-- number as of 10 Sep 2026 is 0174.

create table if not exists public.equipment_types (
  key        text primary key,
  label      text not null,
  sort_order integer not null default 100,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.equipment_types enable row level security;

create policy "Anyone can read equipment types"
on public.equipment_types for select using (true);

create policy "Admins manage equipment types"
on public.equipment_types for all
using ((select public.is_admin())) with check ((select public.is_admin()));

grant select on public.equipment_types to anon, authenticated;

insert into public.equipment_types (key, label, sort_order) values
  ('collar',        'Collar',              10),
  ('harness',       'Harness',             20),
  ('leash',         'Leash / lead',        30),
  ('long_line',     'Long line',           40),
  ('crate',         'Crate',               50),
  ('muzzle',        'Muzzle',              60),
  ('bite_equipment','Bite equipment',      70),
  ('training_aid',  'Training aid',        80),
  ('bedding',       'Bedding',             90),
  ('bowls_feeding', 'Bowls & feeding',    100),
  ('grooming',      'Grooming',           110),
  ('apparel',       'Apparel',            120),
  ('other',         'Other',              900)
on conflict (key) do nothing;

alter table public.catalogue_items
  add column if not exists equipment_type text;

alter table public.catalogue_items
  drop constraint if exists catalogue_items_equipment_type_fkey;
alter table public.catalogue_items
  add constraint catalogue_items_equipment_type_fkey
  foreign key (equipment_type) references public.equipment_types(key);

notify pgrst, 'reload schema';
