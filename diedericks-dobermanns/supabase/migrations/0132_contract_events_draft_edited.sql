-- 0132 — Draft edits and post-send versions write contract_events.
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
    'draft_edited'::text
  ]));
