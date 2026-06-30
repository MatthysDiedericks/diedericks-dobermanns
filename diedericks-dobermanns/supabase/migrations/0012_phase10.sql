-- Phase 10: genetics, contacts, health records, document links

ALTER TABLE dogs
  ADD COLUMN IF NOT EXISTS genetics_b_locus TEXT CHECK (genetics_b_locus IN ('BB','Bb','bb')),
  ADD COLUMN IF NOT EXISTS genetics_d_locus TEXT CHECK (genetics_d_locus IN ('DD','Dd','dd')),
  ADD COLUMN IF NOT EXISTS genetics_vwd_status TEXT CHECK (genetics_vwd_status IN ('clear','carrier','affected')),
  ADD COLUMN IF NOT EXISTS call_name TEXT,
  ADD COLUMN IF NOT EXISTS breeding_status TEXT DEFAULT 'not_breeding',
  ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id);

CREATE TABLE IF NOT EXISTS contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  id_number TEXT,
  tags TEXT[] DEFAULT '{}',
  is_do_not_sell BOOLEAN DEFAULT FALSE,
  popia_consent BOOLEAN DEFAULT FALSE,
  popia_consent_date TIMESTAMPTZ,
  notes TEXT,
  first_contact_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS vet_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id UUID REFERENCES dogs(id) ON DELETE CASCADE,
  visit_date TIMESTAMPTZ NOT NULL,
  vet_clinic TEXT,
  vet_name TEXT,
  reason TEXT NOT NULL,
  diagnosis TEXT,
  treatment TEXT,
  medications TEXT,
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_date TIMESTAMPTZ,
  cost NUMERIC(10,2),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vet_visits ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS deworming_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_ids UUID[] NOT NULL,
  treatment_type TEXT CHECK (treatment_type IN ('dewormer','tick_flea','both')) NOT NULL,
  product_name TEXT,
  date_treated DATE NOT NULL,
  next_due_date DATE,
  weight_kg NUMERIC(5,2),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE deworming_records ENABLE ROW LEVEL SECURITY;

ALTER TABLE kennel_documents
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS linked_dog_id UUID REFERENCES dogs(id),
  ADD COLUMN IF NOT EXISTS linked_litter_id UUID REFERENCES litters(id);

ALTER TABLE heat_cycles
  ADD COLUMN IF NOT EXISTS next_heat_date DATE;
