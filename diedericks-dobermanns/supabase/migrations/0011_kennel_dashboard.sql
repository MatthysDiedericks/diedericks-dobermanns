-- Kennel dashboard schema (reference — apply only if not already on remote)
-- heat_cycles, todo_items, contract_templates, kennel_documents + column enhancements

CREATE TABLE IF NOT EXISTS heat_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id uuid NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  heat_start_date date NOT NULL,
  ovulation_date date,
  mating_date date,
  mating_type text,
  sire_id uuid REFERENCES dogs(id),
  expected_whelp_date date,
  status text NOT NULL DEFAULT 'in_heat',
  resulting_litter_id uuid REFERENCES litters(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS todo_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'general',
  priority text NOT NULL DEFAULT 'normal',
  due_date date,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  litter_id uuid REFERENCES litters(id),
  dog_id uuid REFERENCES dogs(id),
  booking_id uuid,
  application_id uuid,
  assigned_to uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contract_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  contract_title text NOT NULL,
  party_1_label text DEFAULT 'Breeder',
  party_2_label text DEFAULT 'Buyer',
  dog_label text DEFAULT 'Dog',
  body_html text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kennel_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  original_filename text NOT NULL,
  file_url text NOT NULL,
  mime_type text,
  file_size bigint,
  category text NOT NULL DEFAULT 'general',
  tags text[],
  is_starred boolean NOT NULL DEFAULT false,
  notes text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE litters ADD COLUMN IF NOT EXISTS litter_letter text;
ALTER TABLE litters ADD COLUMN IF NOT EXISTS mating_type text;
ALTER TABLE litters ADD COLUMN IF NOT EXISTS go_home_date date;
ALTER TABLE litters ADD COLUMN IF NOT EXISTS go_home_weeks int DEFAULT 10;
ALTER TABLE litters ADD COLUMN IF NOT EXISTS male_count int DEFAULT 0;
ALTER TABLE litters ADD COLUMN IF NOT EXISTS female_count int DEFAULT 0;
ALTER TABLE litters ADD COLUMN IF NOT EXISTS heat_cycle_id uuid REFERENCES heat_cycles(id);

ALTER TABLE dogs ADD COLUMN IF NOT EXISTS litter_id uuid REFERENCES litters(id);
ALTER TABLE dogs ADD COLUMN IF NOT EXISTS reserved_for_name text;
ALTER TABLE dogs ADD COLUMN IF NOT EXISTS new_owner_name text;
ALTER TABLE dogs ADD COLUMN IF NOT EXISTS registration_number text;
ALTER TABLE dogs ADD COLUMN IF NOT EXISTS collar_colour text;

ALTER TABLE contracts ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES contract_templates(id);
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_title text;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS body_html text;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signed_by_breeder boolean DEFAULT false;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS esign_token text UNIQUE;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS esign_expires_at timestamptz;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS esign_sent_at timestamptz;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft';
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_ip_on_sign text;

ALTER TABLE waiting_list ADD COLUMN IF NOT EXISTS pipeline_stage text;
ALTER TABLE waiting_list ADD COLUMN IF NOT EXISTS follow_up_date date;
