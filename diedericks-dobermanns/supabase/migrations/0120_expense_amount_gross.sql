-- What actually left the bank: net amount plus VAT. amount stays net so a later
-- VAT registration can switch reporting back without rewriting history.
-- Generated, stored, reversible — drop the column to undo.

alter table public.expenses
  add column if not exists amount_gross numeric(12,2)
  generated always as (amount + coalesce(vat_amount, 0)) stored;

comment on column public.expenses.amount_gross is
  'Gross spend (amount + VAT). Use this for totals while not VAT-registered.';

create index if not exists idx_expenses_amount_gross on public.expenses (amount_gross);

-- Expenses is already in the audit-table list; attach trg_audit if it is missing.
do $$
declare
  fn_name text;
begin
  if exists (
    select 1
      from pg_trigger t
      join pg_class c on c.oid = t.tgrelid
     where not t.tgisinternal
       and t.tgname = 'trg_audit'
       and c.relname = 'expenses'
       and c.relnamespace = 'public'::regnamespace
  ) then
    return;
  end if;

  select p.proname into fn_name
    from pg_trigger t
    join pg_proc p on p.oid = t.tgfoid
    join pg_class c on c.oid = t.tgrelid
   where not t.tgisinternal
     and t.tgname = 'trg_audit'
   limit 1;

  if fn_name is null then
    raise notice 'No trg_audit function found — expense edits will be audited from the app.';
    return;
  end if;

  execute format(
    'create trigger trg_audit after insert or update or delete on public.expenses for each row execute function public.%I()',
    fn_name
  );
end $$;
