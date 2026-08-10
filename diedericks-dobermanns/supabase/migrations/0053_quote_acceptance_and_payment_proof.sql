-- ============================================================================
-- Quote acceptance + proof of payment.
--
-- Closes: approve → quote → client accepts in portal → uploads proof →
-- admin confirms via convert_quote_to_invoice.
--
-- Additive only. Do not loosen existing documents or quotes policies —
-- revoke/widen mistakes have taken the site down before.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Quotes — acceptance evidence + send stamp
-- ---------------------------------------------------------------------------
alter table public.quotes
  add column if not exists accepted_by uuid references public.users (id) on delete set null,
  add column if not exists accepted_at timestamptz,
  add column if not exists declined_reason text,
  add column if not exists sent_at timestamptz;

create index if not exists idx_quotes_sent_at on public.quotes (sent_at);
create index if not exists idx_quotes_accepted_at on public.quotes (accepted_at);

-- ---------------------------------------------------------------------------
-- 2. Documents — proof-of-payment category + quote/invoice links
-- ---------------------------------------------------------------------------
-- Category values below are the 33 live snake_case values used by the app
-- and the DBP import script. Confirm with:
--   select pg_get_constraintdef(oid) from pg_constraint
--   where conname = 'documents_category_check';
-- before applying if the remote constraint has drifted.
alter table public.documents drop constraint if exists documents_category_check;
alter table public.documents add constraint documents_category_check
  check (category in (
    'pedigree', 'registration', 'microchip', 'dna_test', 'health_certificate',
    'vaccination_record', 'hip_elbow_score', 'eye_test', 'heart_test',
    'import_permit', 'export_permit', 'insurance', 'show_certificate',
    'training_certificate', 'other',
    'litter_registration', 'stud_agreement', 'whelping_record',
    'puppy_birth_certificate',
    'purchase_agreement', 'puppy_guarantee', 'health_warranty',
    'transfer_of_ownership', 'nda',
    'application_supporting_doc', 'vet_reference', 'id_document',
    'training_report', 'completion_certificate', 'psa_certificate',
    'kennel_licence', 'breed_society_registration', 'vet_practice_agreement',
    'proof_of_payment'
  ));

alter table public.documents
  add column if not exists related_quote_id uuid references public.quotes (id) on delete set null,
  add column if not exists related_invoice_id uuid references public.invoices (id) on delete set null,
  add column if not exists review_status text
    check (review_status is null or review_status in ('pending', 'cleared', 'rejected')),
  add column if not exists review_note text;

create index if not exists idx_documents_related_quote
  on public.documents (related_quote_id)
  where related_quote_id is not null;

-- ---------------------------------------------------------------------------
-- 3. notifications_log — quote / proof workflow types
-- ---------------------------------------------------------------------------
alter table public.notifications_log drop constraint if exists notifications_log_type_check;
alter table public.notifications_log add constraint notifications_log_type_check
  check (type in (
    'push', 'email', 'whatsapp', 'application_confirmation', 'document_expiry',
    'application_received', 'application_reminder', 'new_application',
    'application_info_requested', 'application_approved', 'application_rejected',
    'quote_sent', 'quote_accepted', 'quote_declined',
    'payment_proof_uploaded', 'payment_proof_rejected'
  ));

-- ---------------------------------------------------------------------------
-- 4. Quotes RLS — clients may view and accept/decline their own quotes
-- ---------------------------------------------------------------------------
-- Application-linked quotes where client_id was never set would otherwise be
-- invisible even after the applicant creates a portal account.
create policy "Client can view application-linked quotes" on public.quotes
  for select using (
    exists (
      select 1 from public.applications a
      where a.id = quotes.application_id
        and a.user_id = auth.uid()
    )
  );

create policy "Client can view application-linked quote items" on public.quote_items
  for select using (
    exists (
      select 1 from public.quotes q
      join public.applications a on a.id = q.application_id
      where q.id = quote_items.quote_id
        and a.user_id = auth.uid()
    )
  );

-- Accept / decline only from `sent`. Evidence columns are part of the check.
create policy "Client can accept or decline own quote" on public.quotes
  for update using (
    status = 'sent'
    and (
      client_id = auth.uid()
      or exists (
        select 1 from public.applications a
        where a.id = quotes.application_id and a.user_id = auth.uid()
      )
    )
  )
  with check (
    (
      client_id = auth.uid()
      or exists (
        select 1 from public.applications a
        where a.id = quotes.application_id and a.user_id = auth.uid()
      )
    )
    and (
      (status = 'accepted' and accepted_by = auth.uid() and accepted_at is not null)
      or (status = 'declined')
    )
  );

-- ---------------------------------------------------------------------------
-- 5. Documents RLS — client proof of payment (additive only)
-- ---------------------------------------------------------------------------
create policy "Client can insert own proof of payment" on public.documents
  for insert with check (
    entity_type = 'client'
    and entity_id = auth.uid()
    and category = 'proof_of_payment'
    and is_public = false
    and uploaded_by = auth.uid()
    and related_quote_id is not null
    and exists (
      select 1 from public.quotes q
      where q.id = related_quote_id
        and (
          q.client_id = auth.uid()
          or exists (
            select 1 from public.applications a
            where a.id = q.application_id and a.user_id = auth.uid()
          )
        )
    )
  );

create policy "Client can view own proof of payment" on public.documents
  for select using (
    category = 'proof_of_payment'
    and entity_type = 'client'
    and entity_id = auth.uid()
  );

-- Admins already have broad documents access on the live project. This policy
-- is a belt-and-braces SELECT so proof rows remain visible if a future
-- policy refactor drops the catch-all admin rule.
create policy "Admins can view proof of payment" on public.documents
  for select using (
    category = 'proof_of_payment' and public.is_admin()
  );

create policy "Admins can update proof of payment review" on public.documents
  for update using (
    category = 'proof_of_payment' and public.is_admin()
  )
  with check (
    category = 'proof_of_payment' and public.is_admin()
  );
