-- The combined portal health schedule (vaccinations + dewormings + vet
-- visits) needs clients to read their own dog's vet visits. `vaccinations`
-- and `deworming_records` already have this exact "owner or reserver" read
-- policy; `vet_visits` never got the equivalent one, so a client currently
-- cannot see it at all (admin/trainer only). Mirrors the existing pattern
-- verbatim.
create policy "vet_visits client read"
  on public.vet_visits
  for select
  using (
    public.is_trainer_or_above()
    or exists (
      select 1 from public.reservations r
       where r.dog_id = vet_visits.dog_id
         and r.client_id = auth.uid()
    )
    or exists (
      select 1 from public.dogs d
       where d.id = vet_visits.dog_id
         and d.owner_id = auth.uid()
    )
  );
