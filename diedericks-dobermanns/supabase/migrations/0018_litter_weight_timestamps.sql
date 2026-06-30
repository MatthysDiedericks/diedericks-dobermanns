-- Timestamp support for twice-daily weighings + litter whelp metadata
ALTER TABLE weight_logs
  ADD COLUMN IF NOT EXISTS recorded_at timestamptz,
  ADD COLUMN IF NOT EXISTS session text CHECK (session IN ('AM', 'PM', 'daily')) DEFAULT 'daily';

ALTER TABLE dogs
  ADD COLUMN IF NOT EXISTS birth_weight_grams integer;

ALTER TABLE litters
  ADD COLUMN IF NOT EXISTS actual_time time,
  ADD COLUMN IF NOT EXISTS whelping_notes text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS deceased_count integer NOT NULL DEFAULT 0;

-- One weight entry per puppy + date + session
CREATE UNIQUE INDEX IF NOT EXISTS idx_weight_logs_dog_date_session
  ON weight_logs (dog_id, recorded_date, session);
