-- Litter form fields (whelping type + ensure optional columns exist)
-- actual_time already added in 0018_litter_weight_timestamps.sql — omitted here

ALTER TABLE litters
  ADD COLUMN IF NOT EXISTS litter_letter text,
  ADD COLUMN IF NOT EXISTS whelping_type text
    CHECK (whelping_type IS NULL OR whelping_type IN ('natural', 'c_section')),
  ADD COLUMN IF NOT EXISTS actual_date date,
  ADD COLUMN IF NOT EXISTS go_home_date date;
