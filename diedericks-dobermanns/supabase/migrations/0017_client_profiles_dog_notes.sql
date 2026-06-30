-- Client-editable dog notes overlay + extended client profile fields on users

CREATE TABLE IF NOT EXISTS client_dog_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dog_id uuid NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  nickname text,
  personal_notes text,
  vet_practice text,
  vet_name text,
  vet_phone text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, dog_id)
);

ALTER TABLE client_dog_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "client own dog notes" ON client_dog_notes;
CREATE POLICY "client own dog notes" ON client_dog_notes
  FOR ALL USING (client_id = auth.uid()) WITH CHECK (client_id = auth.uid());

DROP POLICY IF EXISTS "admin read dog notes" ON client_dog_notes;
CREATE POLICY "admin read dog notes" ON client_dog_notes
  FOR SELECT USING (public.is_admin());

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS whatsapp_number text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS dog_experience text,
  ADD COLUMN IF NOT EXISTS current_pets text,
  ADD COLUMN IF NOT EXISTS has_children boolean,
  ADD COLUMN IF NOT EXISTS property_type text,
  ADD COLUMN IF NOT EXISTS has_fencing boolean,
  ADD COLUMN IF NOT EXISTS purpose text[],
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text,
  ADD COLUMN IF NOT EXISTS emergency_contact_relationship text,
  ADD COLUMN IF NOT EXISTS vet_practice text,
  ADD COLUMN IF NOT EXISTS vet_name text,
  ADD COLUMN IF NOT EXISTS vet_phone text,
  ADD COLUMN IF NOT EXISTS profile_completed_at timestamptz;
