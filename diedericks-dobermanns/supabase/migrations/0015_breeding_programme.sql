-- Breeding Programme: dog lineage fields, pairings table, litter succession

ALTER TABLE dogs
  ADD COLUMN IF NOT EXISTS line text CHECK (line IN ('A', 'B', 'Cross', 'Unknown')),
  ADD COLUMN IF NOT EXISTS generation int,
  ADD COLUMN IF NOT EXISTS breeding_role text CHECK (breeding_role IN ('Sire', 'Dam', 'Both', 'Retired', 'Prospect')),
  ADD COLUMN IF NOT EXISTS urgency_flag boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS health_dcm1 text CHECK (health_dcm1 IN ('Clear', 'Carrier', 'Affected', 'Pending')),
  ADD COLUMN IF NOT EXISTS health_dcm2 text CHECK (health_dcm2 IN ('Clear', 'Carrier', 'Affected', 'Pending')),
  ADD COLUMN IF NOT EXISTS health_dcm3 text CHECK (health_dcm3 IN ('Clear', 'Carrier', 'Affected', 'Pending')),
  ADD COLUMN IF NOT EXISTS health_dcm4 text CHECK (health_dcm4 IN ('Clear', 'Carrier', 'Affected', 'Pending')),
  ADD COLUMN IF NOT EXISTS health_dcm5 text CHECK (health_dcm5 IN ('Clear', 'Carrier', 'Affected', 'Pending')),
  ADD COLUMN IF NOT EXISTS health_hd text CHECK (health_hd IN ('A', 'B', 'C', 'D', 'E', 'Pending')),
  ADD COLUMN IF NOT EXISTS health_ed text CHECK (health_ed IN ('0', '1', '2', '3', 'Pending')),
  ADD COLUMN IF NOT EXISTS holter_date date,
  ADD COLUMN IF NOT EXISTS holter_result text CHECK (holter_result IN ('Normal', 'Abnormal', 'Pending')),
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS origin_pairing_id uuid;

CREATE TABLE IF NOT EXISTS pairings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sire_id uuid NOT NULL REFERENCES dogs(id),
  dam_id uuid NOT NULL REFERENCES dogs(id),
  line text NOT NULL CHECK (line IN ('A', 'B', 'Cross')),
  generation int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'Planned' CHECK (status IN ('Planned', 'Active', 'Completed', 'Cancelled', 'Prohibited')),
  priority text NOT NULL DEFAULT 'Active' CHECK (priority IN ('Critical', 'Urgent', 'High', 'Active', 'Future', 'Prohibited', 'Done')),
  target_date date,
  date_bred date,
  coi_estimate float,
  expected_litter_date date,
  litter_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pairings
  ADD CONSTRAINT pairings_litter_id_fkey
  FOREIGN KEY (litter_id) REFERENCES litters(id) ON DELETE SET NULL;

ALTER TABLE dogs
  ADD CONSTRAINT dogs_origin_pairing_id_fkey
  FOREIGN KEY (origin_pairing_id) REFERENCES pairings(id) ON DELETE SET NULL;

ALTER TABLE litters
  ADD COLUMN IF NOT EXISTS pairing_id uuid REFERENCES pairings(id),
  ADD COLUMN IF NOT EXISTS retained_male_id uuid REFERENCES dogs(id),
  ADD COLUMN IF NOT EXISTS retained_female_ids uuid[];

ALTER TABLE pairings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pairings admin full" ON pairings;
CREATE POLICY "pairings admin full" ON pairings
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "pairings staff read" ON pairings;
CREATE POLICY "pairings staff read" ON pairings
  FOR SELECT USING (public.is_trainer_or_above());

CREATE INDEX IF NOT EXISTS idx_pairings_generation ON pairings(generation);
CREATE INDEX IF NOT EXISTS idx_pairings_status ON pairings(status);
CREATE INDEX IF NOT EXISTS idx_dogs_line ON dogs(line);
