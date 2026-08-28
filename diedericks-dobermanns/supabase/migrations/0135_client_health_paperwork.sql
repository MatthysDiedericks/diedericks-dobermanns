-- Additive: a client may file vet paperwork on their own dogs.
-- Does not replace or widen any existing documents policy.
-- Staff already insert via "staff insert documents rows".
-- Nothing in this change sends email or WhatsApp.

create policy "Client can insert own health paperwork" on public.documents
  for insert with check (
    entity_type = 'health'
    and provided_by = 'client'
    and review_status = 'pending'
    and client_visible = true
    and is_public = false
    and uploaded_by = auth.uid()
    and category in ('vaccination_record', 'health_certificate', 'microchip', 'other')
    and entity_id in (select public.dog_ids_for(auth.uid()))
  );

create policy "Client can view own health paperwork" on public.documents
  for select using (
    entity_type = 'health'
    and provided_by = 'client'
    and uploaded_by = auth.uid()
  );

-- Staff confirm or ask for a clearer copy. Existing proof-of-payment review
-- policy is category-specific; this covers client health (and other) uploads.
create policy "Staff can review client documents" on public.documents
  for update using (
    provided_by = 'client'
    and public.is_trainer_or_above()
  )
  with check (
    provided_by = 'client'
    and public.is_trainer_or_above()
  );
