-- Link calendar events and contracts to litters for litter detail tabs

ALTER TABLE calendar_events
  ADD COLUMN IF NOT EXISTS litter_id uuid REFERENCES litters(id) ON DELETE SET NULL;

ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS litter_id uuid REFERENCES litters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_events_litter ON calendar_events(litter_id);
CREATE INDEX IF NOT EXISTS idx_contracts_litter ON contracts(litter_id);
