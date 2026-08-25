-- 0116 — In-app notice when a dog is shared with a client.
-- Sharing never sends email; this type is inbox-only.

alter table public.notifications_log
  drop constraint if exists notifications_log_type_check;

alter table public.notifications_log
  add constraint notifications_log_type_check
  check (type = any (array[
    'email'::text,
    'new_application'::text,
    'application_received'::text,
    'application_info_requested'::text,
    'application_approved'::text,
    'application_rejected'::text,
    'quote_sent'::text,
    'quote_accepted'::text,
    'quote_declined'::text,
    'payment_proof_uploaded'::text,
    'payment_proof_rejected'::text,
    'training_request'::text,
    'dog_birthday'::text,
    'issue_reported'::text,
    'issue_captured'::text,
    'dog_shared'::text
  ]));
