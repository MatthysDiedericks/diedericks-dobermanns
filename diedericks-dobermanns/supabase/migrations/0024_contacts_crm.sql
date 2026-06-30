-- 0024 — CRM: contact_type segmentation, user linking, interaction history

ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS contact_type text NOT NULL DEFAULT 'prospect'
    CHECK (contact_type IN ('client', 'prospect', 'breeder', 'supplier', 'judge', 'staff', 'other')),
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS whatsapp_number text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS company text,
  ADD COLUMN IF NOT EXISTS marketing_opt_in boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual'
    CHECK (source IN ('manual', 'app_signup', 'enquiry', 'referral', 'import'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_linked_user
  ON contacts(user_id) WHERE user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS contact_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  logged_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  interaction_type text NOT NULL
    CHECK (interaction_type IN ('whatsapp', 'email', 'call', 'meeting', 'note', 'sms')),
  direction text NOT NULL DEFAULT 'outbound'
    CHECK (direction IN ('outbound', 'inbound')),
  subject text,
  body text,
  interaction_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interactions_contact
  ON contact_interactions(contact_id, interaction_date DESC);

ALTER TABLE contact_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and trainers manage interactions"
  ON contact_interactions FOR ALL
  USING (is_trainer_or_above()) WITH CHECK (is_trainer_or_above());

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contacts' AND policyname = 'Admins manage contacts'
  ) THEN
    CREATE POLICY "Admins manage contacts" ON contacts
      FOR ALL USING (is_admin()) WITH CHECK (is_admin());
    CREATE POLICY "Trainers read contacts" ON contacts
      FOR SELECT USING (is_trainer_or_above());
  END IF;
END $$;

CREATE OR REPLACE FUNCTION sync_user_to_contacts()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO contacts (
    full_name, email, phone, city, country,
    contact_type, source, user_id, marketing_opt_in,
    tags, first_contact_date, created_at, updated_at
  )
  VALUES (
    COALESCE(NEW.full_name, 'App User'),
    (SELECT email FROM auth.users WHERE id = NEW.id),
    NEW.phone,
    NEW.city,
    NEW.country,
    'client',
    'app_signup',
    NEW.id,
    COALESCE(NEW.marketing_opt_in, false),
    ARRAY['Customer'],
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id) WHERE user_id IS NOT NULL DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    city = EXCLUDED.city,
    country = EXCLUDED.country,
    marketing_opt_in = EXCLUDED.marketing_opt_in,
    updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_user_to_contacts ON public.users;
CREATE TRIGGER trg_sync_user_to_contacts
  AFTER INSERT OR UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION sync_user_to_contacts();

INSERT INTO contacts (
  full_name, email, phone, city, country,
  contact_type, source, user_id, marketing_opt_in,
  tags, first_contact_date, created_at, updated_at
)
SELECT
  COALESCE(u.full_name, 'App User'),
  a.email,
  u.phone,
  u.city,
  u.country,
  'client',
  'app_signup',
  u.id,
  COALESCE(u.marketing_opt_in, false),
  ARRAY['Customer'],
  u.created_at,
  u.created_at,
  u.created_at
FROM public.users u
JOIN auth.users a ON a.id = u.id
WHERE NOT EXISTS (
  SELECT 1 FROM contacts c WHERE c.user_id = u.id
);
