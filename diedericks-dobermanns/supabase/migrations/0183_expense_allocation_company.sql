-- 0183 — company overhead on expenses.allocation_type
--
-- Overhead that never touches an animal's cost: office, accounting, bank
-- charges, software, marketing, kennel repairs, tools, cleaning, property
-- insurance. Without this value those costs fall into shared and are spread
-- by dog-days, which inflates every dog and distorts the bitch comparison.
--
-- Does not reclassify existing rows. The 349 in shared include real company
-- costs; Matt pulls them out from the expenses list.

alter table public.expenses drop constraint if exists expenses_allocation_type_check;

alter table public.expenses
  add constraint expenses_allocation_type_check
  check (allocation_type in ('company', 'shared', 'dog', 'litter'));

comment on column public.expenses.allocation_type is
  'Header summary of a single-line invoice. company = business overhead, never on an animal. shared = kennel pool, split at capture. dog / litter = direct. Once expense_lines exist, lines are the source of truth for mixed invoices.';

notify pgrst, 'reload schema';
