-- Staff-attached payment proofs: label the source, audit the ledger.

alter table public.documents
  add column if not exists provided_by text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'documents_provided_by_check'
  ) then
    alter table public.documents
      add constraint documents_provided_by_check
      check (provided_by is null or provided_by in ('client', 'staff'));
  end if;
end $$;

update public.documents d
   set provided_by = case
     when d.uploaded_by is not null and d.uploaded_by = d.entity_id then 'client'
     else 'staff'
   end
 where d.category = 'proof_of_payment'
   and d.provided_by is null;

create or replace function public.trg_documents_provided_by()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.category = 'proof_of_payment' and new.provided_by is null then
    if new.uploaded_by is not null and new.uploaded_by = new.entity_id then
      new.provided_by := 'client';
    else
      new.provided_by := 'staff';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_documents_provided_by on public.documents;
create trigger trg_documents_provided_by
  before insert or update of uploaded_by, entity_id, category, provided_by
  on public.documents
  for each row execute function public.trg_documents_provided_by();

-- Staff may insert proof rows when table RLS is on.
do $$
begin
  if exists (
    select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relname = 'documents'
       and c.relrowsecurity
  ) then
    execute 'drop policy if exists "staff insert documents rows" on public.documents';
    execute $p$
      create policy "staff insert documents rows"
        on public.documents
        for insert
        to authenticated
        with check (public.is_trainer_or_above())
    $p$;
  end if;
end $$;

-- Audit the receipts ledger the same way invoices are audited.
do $$
declare
  def text;
begin
  select pg_get_triggerdef(t.oid) into def
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
   where not t.tgisinternal
     and t.tgname = 'trg_audit'
     and c.relname in ('invoices', 'payments')
   order by case c.relname when 'invoices' then 0 else 1 end
   limit 1;
  if def is not null then
    execute 'drop trigger if exists trg_audit on public.invoice_payments';
    execute replace(
      replace(def, ' ON public.invoices', ' ON public.invoice_payments'),
      ' ON public.payments',
      ' ON public.invoice_payments'
    );
  end if;
end $$;

grant execute on function public.is_admin() to public, anon, authenticated, service_role;
grant execute on function public.is_trainer_or_above() to public, anon, authenticated, service_role;
