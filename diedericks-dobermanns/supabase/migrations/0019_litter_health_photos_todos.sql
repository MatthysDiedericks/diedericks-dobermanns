-- Health records, media, todos, financials, sharing for litters
CREATE TABLE IF NOT EXISTS puppy_health_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  litter_id uuid REFERENCES litters(id) ON DELETE CASCADE,
  dog_id uuid REFERENCES dogs(id) ON DELETE CASCADE,
  record_type text NOT NULL CHECK (record_type IN ('vaccination', 'deworming', 'vet_visit', 'health_test')),
  record_date date NOT NULL,
  type_label text NOT NULL,
  description text NOT NULL,
  notes text,
  administered_by text,
  next_due_date date,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE puppy_health_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_health" ON puppy_health_records
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "client_view_own_health" ON puppy_health_records
  FOR SELECT USING (
    dog_id IN (
      SELECT d.id FROM dogs d
      INNER JOIN reservations r ON r.dog_id = d.id
      WHERE r.client_id = auth.uid()
    )
  );

CREATE TABLE IF NOT EXISTS litter_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  litter_id uuid REFERENCES litters(id) ON DELETE CASCADE,
  dog_id uuid REFERENCES dogs(id) ON DELETE CASCADE,
  media_type text NOT NULL CHECK (media_type IN ('photo', 'video')),
  storage_path text NOT NULL,
  public_url text NOT NULL,
  caption text,
  sort_order integer DEFAULT 0,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE litter_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_media" ON litter_media
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "client_view_litter_media" ON litter_media
  FOR SELECT USING (
    litter_id IN (
      SELECT d.litter_id FROM dogs d
      INNER JOIN reservations r ON r.dog_id = d.id
      WHERE r.client_id = auth.uid() AND d.litter_id IS NOT NULL
    )
  );

CREATE TABLE IF NOT EXISTS litter_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  litter_id uuid REFERENCES litters(id) ON DELETE CASCADE,
  dog_id uuid REFERENCES dogs(id) ON DELETE CASCADE,
  due_date date,
  title text NOT NULL,
  description text,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE litter_todos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_todos" ON litter_todos
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS litter_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  litter_id uuid REFERENCES litters(id) ON DELETE CASCADE,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  transaction_type text NOT NULL CHECK (transaction_type IN ('income', 'expense')),
  category text,
  currency text NOT NULL DEFAULT 'ZAR',
  amounts_tax_mode text DEFAULT 'exclusive' CHECK (amounts_tax_mode IN ('inclusive', 'exclusive')),
  invoice_number text,
  notes text,
  attachment_path text,
  subtotal_cents integer NOT NULL DEFAULT 0,
  tax_cents integer NOT NULL DEFAULT 0,
  total_cents integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS litter_transaction_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES litter_transactions(id) ON DELETE CASCADE,
  dog_id uuid REFERENCES dogs(id) ON DELETE SET NULL,
  description text NOT NULL,
  amount_cents integer NOT NULL DEFAULT 0,
  tax_cents integer NOT NULL DEFAULT 0,
  sort_order integer DEFAULT 0
);

ALTER TABLE litter_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE litter_transaction_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_transactions" ON litter_transactions
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin_all_transaction_items" ON litter_transaction_items
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS puppy_sharing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id uuid REFERENCES dogs(id) ON DELETE CASCADE UNIQUE,
  is_public_page boolean DEFAULT false,
  is_pedigree_public boolean DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE puppy_sharing ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_all_sharing" ON puppy_sharing
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE litters
  ADD COLUMN IF NOT EXISTS public_sections text[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_puppy_health_litter ON puppy_health_records(litter_id);
CREATE INDEX IF NOT EXISTS idx_puppy_health_dog ON puppy_health_records(dog_id);
CREATE INDEX IF NOT EXISTS idx_litter_media_litter ON litter_media(litter_id);
CREATE INDEX IF NOT EXISTS idx_litter_media_dog ON litter_media(dog_id);
CREATE INDEX IF NOT EXISTS idx_litter_todos_litter ON litter_todos(litter_id);
CREATE INDEX IF NOT EXISTS idx_litter_transactions_litter ON litter_transactions(litter_id);

-- Storage bucket for litter photos (admin write, signed read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('litter-media', 'litter-media', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "litter media admin read" ON storage.objects
  FOR SELECT USING (bucket_id = 'litter-media' AND public.is_admin());

CREATE POLICY "litter media admin write" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'litter-media' AND public.is_admin());

CREATE POLICY "litter media admin modify" ON storage.objects
  FOR UPDATE USING (bucket_id = 'litter-media' AND public.is_admin());

CREATE POLICY "litter media admin delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'litter-media' AND public.is_admin());
