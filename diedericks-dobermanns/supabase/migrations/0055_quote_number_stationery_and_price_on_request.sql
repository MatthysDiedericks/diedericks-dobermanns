-- ============================================================================
-- Quote stationery numbering (DD-1133+) + price_on_request column sync.
--
-- Live already has pricing_tiers.price_on_request (added ad hoc). This migration
-- records it for the repo and switches quote_number generation from QTE-0001
-- to the kennel's historical stationery style: DD-1133, DD-1134, …
-- Existing quote rows are left unchanged.
-- ============================================================================

alter table public.pricing_tiers
  add column if not exists price_on_request boolean not null default false;

comment on column public.pricing_tiers.price_on_request is
  'When true, price is quoted per client (UI leaves amount blank). Distinct from price=0 with flag false (unset — block send).';

create or replace function public.assign_quote_number()
returns trigger
language plpgsql
as $$
begin
  if new.quote_number is null or new.quote_number = '' then
    new.quote_number := 'DD-' || nextval('public.quote_number_seq')::text;
  end if;
  return new;
end;
$$;

-- Next assigned number is at least 1133, or one past the highest existing DD-N.
select setval(
  'public.quote_number_seq',
  greatest(
    1132,
    coalesce(
      (
        select max(substring(q.quote_number from 4)::bigint)
        from public.quotes q
        where q.quote_number ~ '^DD-[0-9]+$'
      ),
      0
    )
  ),
  true
);
