-- ============================================================================
-- Fulfilment: dog handover logistics + reinforce stationery quote numbers.
--
-- Quote numbers: migration 0055 already switched assign_quote_number to DD-N.
-- This migration re-applies that (idempotent) so numbering cannot be skipped if
-- 0055 was left unapplied, and adds dogs.handover_* for sold-but-not-delivered.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Quote numbering — DD-1133, DD-1134, … (trigger on insert)
-- ---------------------------------------------------------------------------
create sequence if not exists public.quote_number_seq;

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

drop trigger if exists trg_assign_quote_number on public.quotes;
create trigger trg_assign_quote_number
  before insert on public.quotes
  for each row execute function public.assign_quote_number();

create unique index if not exists quotes_quote_number_key on public.quotes (quote_number);

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

-- ---------------------------------------------------------------------------
-- 2. Dog handover / delivery logistics (commercial status stays dogs.status)
-- ---------------------------------------------------------------------------
alter table public.dogs
  add column if not exists handover_status text
    check (
      handover_status is null
      or handover_status in ('awaiting_go_home', 'ready', 'scheduled', 'delivered')
    ),
  add column if not exists handover_date date,
  add column if not exists delivered_at timestamptz,
  add column if not exists delivery_method text
    check (
      delivery_method is null
      or delivery_method in ('collected', 'delivered', 'flown')
    ),
  add column if not exists delivery_notes text;

comment on column public.dogs.handover_status is
  'Logistics only. dogs.status=sold is the commercial fact; handover tracks go-home.';

create index if not exists idx_dogs_handover_status
  on public.dogs (handover_status)
  where handover_status is not null and handover_status <> 'delivered';
