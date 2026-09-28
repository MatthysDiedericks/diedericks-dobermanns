-- 0189 — Record when an invoice was emailed to the client.
--
-- A quote can be sent. An invoice could not: there was no send action and no
-- columns to answer "has this client been told?". sent_at is the *last* send
-- (resend is normal). send_count is how many times it went out.
-- Creating or converting a quote never writes these — only the Send action.

alter table public.invoices
  add column if not exists sent_at    timestamptz,
  add column if not exists sent_by    uuid references auth.users(id),
  add column if not exists sent_to    text,
  add column if not exists send_count integer not null default 0;

comment on column public.invoices.sent_at is
  'When the invoice was last emailed to the client. Null means the client has never been told it exists. Overwritten on each successful resend; send_count is the chase history.';

comment on column public.invoices.sent_by is
  'Admin who last emailed the invoice.';

comment on column public.invoices.sent_to is
  'Address the last successful send went to.';

comment on column public.invoices.send_count is
  'How many times this invoice has been emailed. Resend is normal.';

alter table public.notifications_log
  drop constraint if exists notifications_log_type_check;

alter table public.notifications_log
  add constraint notifications_log_type_check
  check (type = any (array[
    'push','email','whatsapp','application_confirmation','document_expiry',
    'application_received','application_reminder','new_application',
    'application_info_requested','application_approved','application_rejected',
    'quote_sent','quote_accepted','quote_declined','quote_reminder_first',
    'quote_reminder_final','quote_lapsed','payment_proof_uploaded',
    'payment_proof_rejected','training_request','dog_birthday','issue_reported',
    'issue_captured','dog_shared','handover_pack_sent','owner_photo_reminder',
    'dog_deceased_reported','recurring_invoice_draft','invoice_sent'
  ]));

notify pgrst, 'reload schema';
