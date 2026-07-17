-- Client portal: owner read on dogs, health records, and public expecting breedings.

-- dogs: owners can read their placed/sold dogs even when not public
DROP POLICY IF EXISTS "dogs owner read" ON public.dogs;
CREATE POLICY "dogs owner read" ON public.dogs
  FOR SELECT USING (owner_id = auth.uid());

-- vaccinations: extend read to dogs owned by the client
DROP POLICY IF EXISTS "vaccinations read" ON public.vaccinations;
CREATE POLICY "vaccinations read" ON public.vaccinations
  FOR SELECT USING (
    public.is_trainer_or_above()
    OR EXISTS (
      SELECT 1 FROM public.reservations r
      WHERE r.dog_id = vaccinations.dog_id AND r.client_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.dogs d
      WHERE d.id = vaccinations.dog_id AND d.owner_id = auth.uid()
    )
  );

-- deworming_records: clients read treatments for owned or reserved dogs
-- NOTE: this table has a single dog_id column (not a dog_ids array) — corrected.
DROP POLICY IF EXISTS "deworming_records client read" ON deworming_records;
CREATE POLICY "deworming_records client read" ON deworming_records
  FOR SELECT USING (
    public.is_trainer_or_above()
    OR EXISTS (
      SELECT 1 FROM public.dogs d
      WHERE d.id = deworming_records.dog_id AND d.owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.reservations r
      WHERE r.dog_id = deworming_records.dog_id AND r.client_id = auth.uid()
    )
  );

-- heat_cycles: clients may see open breedings for public dams (no internal notes in app query)
DROP POLICY IF EXISTS "heat_cycles public expecting read" ON heat_cycles;
CREATE POLICY "heat_cycles public expecting read" ON heat_cycles
  FOR SELECT USING (
    public.is_trainer_or_above()
    OR (
      mating_date IS NOT NULL
      AND resulting_litter_id IS NULL
      AND status NOT IN ('no_outcome', 'cancelled', 'completed')
      AND EXISTS (
        SELECT 1 FROM public.dogs d
        WHERE d.id = heat_cycles.dog_id AND d.is_public = true
      )
    )
  );
