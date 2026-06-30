-- 0022 — Add Trial status to pairings for sandbox planning
-- Allows trial pairings to live in the same table without appearing in main programme.

ALTER TABLE pairings
  DROP CONSTRAINT IF EXISTS pairings_status_check;

ALTER TABLE pairings
  ADD CONSTRAINT pairings_status_check
  CHECK (status IN ('Planned', 'Active', 'Completed', 'Cancelled', 'Prohibited', 'Trial'));

ALTER TABLE pairings
  ADD COLUMN IF NOT EXISTS trial_generation int DEFAULT 1
    CHECK (trial_generation BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS trial_notes text;
