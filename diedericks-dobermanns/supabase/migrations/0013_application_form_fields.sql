-- Enhanced puppy application form fields

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS date_of_birth            TEXT,
  ADD COLUMN IF NOT EXISTS occupation               TEXT,
  ADD COLUMN IF NOT EXISTS employer                 TEXT,
  ADD COLUMN IF NOT EXISTS instagram_handle         TEXT,
  ADD COLUMN IF NOT EXISTS facebook_profile         TEXT,
  ADD COLUMN IF NOT EXISTS hours_alone_per_day      TEXT,
  ADD COLUMN IF NOT EXISTS exercise_level           TEXT,
  ADD COLUMN IF NOT EXISTS yard_size                TEXT,
  ADD COLUMN IF NOT EXISTS sleeping_arrangement     TEXT,
  ADD COLUMN IF NOT EXISTS why_dobermann            TEXT,
  ADD COLUMN IF NOT EXISTS aware_of_dcm             TEXT,
  ADD COLUMN IF NOT EXISTS aware_of_commitment      TEXT,
  ADD COLUMN IF NOT EXISTS aware_of_costs           TEXT,
  ADD COLUMN IF NOT EXISTS dobermann_experience_level TEXT,
  ADD COLUMN IF NOT EXISTS previous_dog_fate        TEXT,
  ADD COLUMN IF NOT EXISTS preferred_sex            TEXT,
  ADD COLUMN IF NOT EXISTS preferred_colour         TEXT,
  ADD COLUMN IF NOT EXISTS tail_preference          TEXT,
  ADD COLUMN IF NOT EXISTS preferred_timeline       TEXT,
  ADD COLUMN IF NOT EXISTS budget_range             TEXT,
  ADD COLUMN IF NOT EXISTS training_planned         BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS delivery_acknowledged    BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS special_requests         TEXT,
  ADD COLUMN IF NOT EXISTS agreed_no_breeding_rights  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS agreed_right_of_recall     BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS agreed_no_resale           BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS agreed_welfare_commitment  BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS agreed_microchip_policy    BOOLEAN DEFAULT FALSE;

-- Support yes / no / in_progress for secure yard (was boolean)
ALTER TABLE applications
  ALTER COLUMN has_secure_yard DROP DEFAULT;

ALTER TABLE applications
  ALTER COLUMN has_secure_yard TYPE TEXT
  USING CASE
    WHEN has_secure_yard IS TRUE THEN 'yes'
    WHEN has_secure_yard IS FALSE THEN 'no'
    ELSE NULL
  END;
