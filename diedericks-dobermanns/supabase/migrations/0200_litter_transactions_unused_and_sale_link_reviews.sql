-- 0200 — litter_transactions is not the litter ledger.
-- Sale-link reviews record a rejected name suggestion.
-- Confirming a suggestion writes invoices.dog_id from the app, not from this table.
-- A rejected pair is not offered again. Nothing here guesses an account.

comment on table public.litter_transactions is
  'Unused. Costs are expense_allocations. Income is invoices reached through dogs.litter_id. Do not query this for litter financials.';

comment on table public.litter_transaction_items is
  'Unused, with litter_transactions. Do not query this for litter financials.';

create table if not exists public.sale_link_reviews (
  dog_id uuid not null references public.dogs(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  decision text not null check (decision in ('rejected')),
  reviewed_by uuid references public.users(id),
  reviewed_at timestamptz not null default now(),
  primary key (dog_id, invoice_id)
);

comment on table public.sale_link_reviews is
  'A person rejected this puppy-invoice name suggestion. Nothing here writes invoices.dog_id.';

alter table public.sale_link_reviews enable row level security;

drop policy if exists "sale_link_reviews_admin" on public.sale_link_reviews;
create policy "sale_link_reviews_admin" on public.sale_link_reviews
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

notify pgrst, 'reload schema';
