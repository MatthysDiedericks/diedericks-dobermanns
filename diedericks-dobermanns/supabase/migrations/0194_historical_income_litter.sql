-- 0194 — Link a historical sale to a litter.
--
-- invoices.litter_id already exists. historical_income only had a free-text
-- litter name, which cannot be joined. The linking screen writes this column.
-- A puppy remains optional: dog_id stays null until someone names one.

alter table public.historical_income
  add column if not exists litter_id uuid references public.litters(id) on delete set null;

create index if not exists historical_income_litter_idx
  on public.historical_income (litter_id)
  where litter_id is not null;

notify pgrst, 'reload schema';
