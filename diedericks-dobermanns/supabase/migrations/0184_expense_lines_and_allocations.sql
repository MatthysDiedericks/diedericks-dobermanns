-- 0184 — expense_lines and expense_allocations (Stage A)
--
-- expenses stays the invoice header. A line records one row on the supplier
-- document. Allocations are the resolved split, frozen at capture — never
-- recomputed at report time, because the dogs on the ground change weekly.
--
-- Existing expenses become a header plus exactly one line, carrying the
-- current allocation_type across. Shared history is not split against today's
-- roster. Direct dog/litter tags become one allocation row.

create table if not exists public.expense_lines (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses (id) on delete cascade,
  description text not null default '',
  quantity numeric(12, 4) not null default 1,
  unit_amount numeric(12, 2),
  line_amount numeric(12, 2) not null,
  vat_rate numeric(5, 2),
  vat_amount numeric(12, 2) not null default 0,
  category_id uuid references public.expense_categories (id) on delete set null,
  allocation_kind text not null
    check (allocation_kind in ('company', 'dog', 'litter', 'shared')),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.expense_allocations (
  id uuid primary key default gen_random_uuid(),
  expense_line_id uuid not null references public.expense_lines (id) on delete cascade,
  dog_id uuid references public.dogs (id) on delete set null,
  litter_id uuid references public.litters (id) on delete set null,
  amount numeric(12, 2) not null,
  weight numeric(12, 4) not null default 1,
  basis_note text,
  created_at timestamptz not null default now(),
  constraint expense_allocations_has_recipient check (
    dog_id is not null or litter_id is not null
  )
);

create index if not exists expense_lines_expense_id_idx
  on public.expense_lines (expense_id);
create index if not exists expense_lines_kind_idx
  on public.expense_lines (allocation_kind);
create index if not exists expense_allocations_line_id_idx
  on public.expense_allocations (expense_line_id);
create index if not exists expense_allocations_dog_id_idx
  on public.expense_allocations (dog_id)
  where dog_id is not null;
create index if not exists expense_allocations_litter_id_idx
  on public.expense_allocations (litter_id)
  where litter_id is not null;

comment on table public.expense_lines is
  'One row per line on a supplier invoice. allocation_kind is company, dog, litter, or shared.';
comment on table public.expense_allocations is
  'Resolved split of a line, written at capture. amount is frozen; do not recompute when a dog is sold.';
comment on column public.expense_allocations.basis_note is
  'Why this split: e.g. "18 active dogs on 28 Aug 2026, weighted by age".';

alter table public.expense_lines enable row level security;
alter table public.expense_allocations enable row level security;

revoke all on public.expense_lines from anon, public;
revoke all on public.expense_allocations from anon, public;
grant select, insert, update, delete on public.expense_lines to authenticated, service_role;
grant select, insert, update, delete on public.expense_allocations to authenticated, service_role;

drop policy if exists expense_lines_admin on public.expense_lines;
create policy expense_lines_admin on public.expense_lines
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists expense_allocations_admin on public.expense_allocations;
create policy expense_allocations_admin on public.expense_allocations
  for all using (public.is_admin()) with check (public.is_admin());

-- Wrap every existing expense as a header with one line.
insert into public.expense_lines (
  expense_id,
  description,
  quantity,
  unit_amount,
  line_amount,
  vat_rate,
  vat_amount,
  category_id,
  allocation_kind,
  sort_order
)
select
  e.id,
  coalesce(nullif(btrim(e.description), ''), 'Expense'),
  1,
  e.amount,
  e.amount,
  e.vat_rate,
  coalesce(e.vat_amount, 0),
  e.category_id,
  case
    when e.allocation_type in ('company', 'dog', 'litter', 'shared')
      then e.allocation_type
    else 'shared'
  end,
  0
from public.expenses e
where not exists (
  select 1 from public.expense_lines el where el.expense_id = e.id
);

-- Direct dog / litter tags become one stored allocation. Shared is not split
-- against today's dogs — that would rewrite history.
insert into public.expense_allocations (
  expense_line_id,
  dog_id,
  litter_id,
  amount,
  weight,
  basis_note
)
select
  el.id,
  e.dog_id,
  null,
  el.line_amount,
  1,
  'direct to one dog'
from public.expense_lines el
join public.expenses e on e.id = el.expense_id
where el.allocation_kind = 'dog'
  and e.dog_id is not null
  and not exists (
    select 1 from public.expense_allocations ea where ea.expense_line_id = el.id
  );

insert into public.expense_allocations (
  expense_line_id,
  dog_id,
  litter_id,
  amount,
  weight,
  basis_note
)
select
  el.id,
  null,
  e.litter_id,
  el.line_amount,
  1,
  'direct to one litter'
from public.expense_lines el
join public.expenses e on e.id = el.expense_id
where el.allocation_kind = 'litter'
  and e.litter_id is not null
  and not exists (
    select 1 from public.expense_allocations ea where ea.expense_line_id = el.id
  );

do $$
declare
  v_expenses int;
  v_lines int;
  v_one_line int;
  v_balanced int;
begin
  select count(*) into v_expenses from public.expenses;
  select count(*) into v_lines from public.expense_lines;
  select count(*) into v_one_line
  from public.expenses e
  where (
    select count(*) from public.expense_lines el where el.expense_id = e.id
  ) = 1;
  select count(*) into v_balanced
  from public.expenses e
  where (
    select count(*) from public.expense_lines el where el.expense_id = e.id
  ) = 1
    and (
      select sum(el.line_amount) from public.expense_lines el where el.expense_id = e.id
    ) = e.amount;

  raise notice '0184 wrap: expenses=% lines=% with_exactly_one_line=% balanced_to_header=%',
    v_expenses, v_lines, v_one_line, v_balanced;
end $$;

notify pgrst, 'reload schema';
