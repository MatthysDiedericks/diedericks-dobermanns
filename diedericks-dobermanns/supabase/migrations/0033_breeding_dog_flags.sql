-- Breeding programme flag columns on dogs (Bridge Sire plan V4)

ALTER TABLE dogs
  ADD COLUMN IF NOT EXISTS flag_last_litter boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS flag_bridge_sire boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS flag_sale_only boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS flag_dcm_carrier boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS flag_high_coi_bg boolean DEFAULT false;
