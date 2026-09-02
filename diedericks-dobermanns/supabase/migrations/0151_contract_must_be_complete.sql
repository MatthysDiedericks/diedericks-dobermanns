-- 0151 — A contract with leftover {{tokens}} cannot leave draft.
-- Already-signed records are legal and stay byte-identical: this trigger
-- only fires on a status transition, never on a row sitting still.

alter table public.contract_events drop constraint if exists contract_events_event_type_check;
alter table public.contract_events
  add constraint contract_events_event_type_check
  check (event_type = any (array[
    'created'::text,
    'sent'::text,
    'viewed'::text,
    'clause_acknowledged'::text,
    'signed_by_client'::text,
    'signed_by_breeder'::text,
    'declined'::text,
    'voided'::text,
    'reminder_sent'::text,
    'draft_edited'::text,
    'regenerated'::text
  ]));

create or replace function public.trg_contract_must_be_complete()
returns trigger language plpgsql as $$
begin
  if new.status is distinct from old.status
     and new.status in ('sent','signed_client','signed_both')
     and new.body_html ~ '\{\{[a-z_]+\}\}' then
    raise exception
      'CONTRACT_INCOMPLETE: % still contains unfilled template fields. Regenerate it before sending.',
      coalesce(new.contract_number, new.id::text)
      using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists trg_contract_must_be_complete on public.contracts;
create trigger trg_contract_must_be_complete
  before update of status on public.contracts
  for each row
  execute function public.trg_contract_must_be_complete();

-- Regenerating a sent or signed body is rewriting a legal record. Draft only.
create or replace function public.trg_contract_body_draft_only()
returns trigger language plpgsql as $$
begin
  if old.status is distinct from 'draft'
     and new.body_html is distinct from old.body_html then
    raise exception
      'CONTRACT_FROZEN: % is %, not draft. The body cannot be regenerated.',
      coalesce(old.contract_number, old.id::text),
      old.status
      using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists trg_contract_body_draft_only on public.contracts;
create trigger trg_contract_body_draft_only
  before update of body_html on public.contracts
  for each row
  execute function public.trg_contract_body_draft_only();
