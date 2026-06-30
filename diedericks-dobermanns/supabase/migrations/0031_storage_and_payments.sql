-- 0031 — Additional storage buckets + PayFast payment orders

INSERT INTO storage.buckets (id, name, public)
VALUES
  ('training-videos', 'training-videos', false),
  ('broadcasts', 'broadcasts', false)
ON CONFLICT (id) DO NOTHING;

-- Training videos: admins upload; clients with bundle access read via signed URLs / RLS
CREATE POLICY IF NOT EXISTS "training videos admin write" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'training-videos' AND public.is_admin()
  );

CREATE POLICY IF NOT EXISTS "training videos admin modify" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'training-videos' AND public.is_admin()
  );

CREATE POLICY IF NOT EXISTS "training videos admin delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'training-videos' AND public.is_admin()
  );

CREATE POLICY IF NOT EXISTS "training videos authenticated read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'training-videos'
    AND (public.is_admin() OR auth.role() = 'authenticated')
  );

-- Broadcast images: admin write; authenticated clients read
CREATE POLICY IF NOT EXISTS "broadcasts admin write" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'broadcasts' AND public.is_admin()
  );

CREATE POLICY IF NOT EXISTS "broadcasts admin modify" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'broadcasts' AND public.is_admin()
  );

CREATE POLICY IF NOT EXISTS "broadcasts admin delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'broadcasts' AND public.is_admin()
  );

CREATE POLICY IF NOT EXISTS "broadcasts authenticated read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'broadcasts'
    AND (public.is_admin() OR auth.role() = 'authenticated')
  );

-- Payment orders (PayFast ITN webhook updates these)
CREATE TABLE IF NOT EXISTS payment_orders (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_type        text NOT NULL CHECK (order_type IN ('video_bundle', 'deposit', 'invoice')),
  reference_id      uuid,
  amount            numeric(10,2) NOT NULL,
  currency          text NOT NULL DEFAULT 'ZAR',
  status            text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed', 'cancelled')),
  m_payment_id      text NOT NULL UNIQUE,
  payfast_payment_id text,
  item_name         text,
  return_url        text,
  notify_url        text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  paid_at           timestamptz
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_client ON payment_orders(client_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders(status);

ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "payment_orders client read own" ON payment_orders
  FOR SELECT USING (client_id = auth.uid() OR public.is_admin());

CREATE POLICY IF NOT EXISTS "payment_orders admin all" ON payment_orders
  FOR ALL USING (public.is_admin());
