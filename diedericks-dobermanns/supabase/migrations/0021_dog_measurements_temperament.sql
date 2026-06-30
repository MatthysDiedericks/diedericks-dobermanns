-- 0021 — Dog measurements, breed standard, bloodline, temperament
-- NOTE: height_cm already existed from the earlier add_dog_detail_fields_and_tables
-- migration — it is NOT re-added here. body_length_cm, chest_depth_cm,
-- chest_girth_cm are new.

ALTER TABLE dogs
  ADD COLUMN IF NOT EXISTS standard text DEFAULT 'fci_kusa'
    CHECK (standard IN ('fci_kusa', 'akc')),
  ADD COLUMN IF NOT EXISTS bloodline_type text DEFAULT 'european'
    CHECK (bloodline_type IN ('european', 'american', 'mixed'));

ALTER TABLE dogs
  ADD COLUMN IF NOT EXISTS body_length_cm numeric(5,1),
  ADD COLUMN IF NOT EXISTS chest_depth_cm numeric(5,1),
  ADD COLUMN IF NOT EXISTS chest_girth_cm numeric(5,1);
-- height_cm already exists — no ADD COLUMN needed

CREATE TABLE IF NOT EXISTS dog_temperament_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id uuid NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  assessed_by uuid REFERENCES auth.users(id),
  assessed_at date NOT NULL DEFAULT CURRENT_DATE,
  evaluation_standard text NOT NULL DEFAULT 'fci_ztp'
    CHECK (evaluation_standard IN ('fci_ztp', 'akc_dpca')),
  nerve_stability int CHECK (nerve_stability BETWEEN 1 AND 10),
  drive_and_energy int CHECK (drive_and_energy BETWEEN 1 AND 10),
  courage int CHECK (courage BETWEEN 1 AND 10),
  hardness int CHECK (hardness BETWEEN 1 AND 10),
  environmental_confidence int CHECK (environmental_confidence BETWEEN 1 AND 10),
  working_willingness int CHECK (working_willingness BETWEEN 1 AND 10),
  social_behavior int CHECK (social_behavior BETWEEN 1 AND 10),
  obedience int CHECK (obedience BETWEEN 1 AND 10),
  total_score int GENERATED ALWAYS AS (
    COALESCE(nerve_stability, 0) +
    COALESCE(drive_and_energy, 0) +
    COALESCE(courage, 0) +
    COALESCE(hardness, 0) +
    COALESCE(environmental_confidence, 0) +
    COALESCE(working_willingness, 0) +
    COALESCE(social_behavior, 0) +
    COALESCE(obedience, 0)
  ) STORED,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_temperament_dog_id ON dog_temperament_scores(dog_id);
CREATE INDEX IF NOT EXISTS idx_temperament_assessed_at ON dog_temperament_scores(assessed_at DESC);

ALTER TABLE dog_temperament_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Trainers and above can read temperament scores"
  ON dog_temperament_scores FOR SELECT
  USING (is_trainer_or_above());

CREATE POLICY "Admins can insert temperament scores"
  ON dog_temperament_scores FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update temperament scores"
  ON dog_temperament_scores FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete temperament scores"
  ON dog_temperament_scores FOR DELETE
  USING (is_admin());
