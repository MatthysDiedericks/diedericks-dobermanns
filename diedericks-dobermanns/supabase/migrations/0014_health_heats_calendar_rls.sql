-- Heat cycle columns, calendar_events table, and RLS for health/heats

ALTER TABLE heat_cycles
  ADD COLUMN IF NOT EXISTS heat_end_date date,
  ADD COLUMN IF NOT EXISTS proestrus_start_date date,
  ADD COLUMN IF NOT EXISTS estrus_start_date date,
  ADD COLUMN IF NOT EXISTS actual_whelp_date date,
  ADD COLUMN IF NOT EXISTS is_predicted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS actual_cycle_length_days int,
  ADD COLUMN IF NOT EXISTS cycle_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS progesterone_tests jsonb,
  ADD COLUMN IF NOT EXISTS cancelled_reason text;

CREATE TABLE IF NOT EXISTS calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  event_type text NOT NULL,
  event_date date NOT NULL,
  end_date date,
  dog_id uuid REFERENCES dogs(id) ON DELETE SET NULL,
  source_table text,
  source_id uuid,
  is_completed boolean NOT NULL DEFAULT false,
  is_reminder boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;

ALTER TABLE vet_visits
  ADD COLUMN IF NOT EXISTS schedule_type text,
  ADD COLUMN IF NOT EXISTS next_due_date date,
  ADD COLUMN IF NOT EXISTS doctor_name text,
  ADD COLUMN IF NOT EXISTS vet_practice_id uuid;

ALTER TABLE vaccinations
  ADD COLUMN IF NOT EXISTS schedule_type text,
  ADD COLUMN IF NOT EXISTS doctor_name text,
  ADD COLUMN IF NOT EXISTS vet_practice_id uuid,
  ADD COLUMN IF NOT EXISTS health_product_id uuid;

ALTER TABLE deworming_records
  ADD COLUMN IF NOT EXISTS schedule_type text,
  ADD COLUMN IF NOT EXISTS doctor_name text,
  ADD COLUMN IF NOT EXISTS vet_practice_id uuid,
  ADD COLUMN IF NOT EXISTS health_product_id uuid;

-- heat_cycles
DROP POLICY IF EXISTS "Admin full access to heat_cycles" ON heat_cycles;
DROP POLICY IF EXISTS "heat_cycles admin full" ON heat_cycles;
CREATE POLICY "heat_cycles admin full" ON heat_cycles
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "heat_cycles staff read" ON heat_cycles;
CREATE POLICY "heat_cycles staff read" ON heat_cycles
  FOR SELECT USING (public.is_trainer_or_above());

ALTER TABLE heat_cycles ENABLE ROW LEVEL SECURITY;

-- vet_visits
DROP POLICY IF EXISTS "vet_visits staff all" ON vet_visits;
CREATE POLICY "vet_visits staff all" ON vet_visits
  FOR ALL USING (public.is_trainer_or_above()) WITH CHECK (public.is_trainer_or_above());

-- deworming_records
DROP POLICY IF EXISTS "deworming_records staff all" ON deworming_records;
CREATE POLICY "deworming_records staff all" ON deworming_records
  FOR ALL USING (public.is_trainer_or_above()) WITH CHECK (public.is_trainer_or_above());

-- calendar_events
DROP POLICY IF EXISTS "calendar_events staff all" ON calendar_events;
CREATE POLICY "calendar_events staff all" ON calendar_events
  FOR ALL USING (public.is_trainer_or_above()) WITH CHECK (public.is_trainer_or_above());
