-- 0027 — Training video library with free/bundle access tiers

CREATE TABLE IF NOT EXISTS video_bundles (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  description  text,
  price        numeric(10,2) NOT NULL DEFAULT 0,
  currency     text NOT NULL DEFAULT 'ZAR',
  is_active    boolean NOT NULL DEFAULT true,
  sort_order   int NOT NULL DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

INSERT INTO video_bundles (name, description, price, sort_order) VALUES
  ('Protection Training Bundle', 'Full 5-phase protection work video series with commentary from our head trainer.', 1200.00, 1),
  ('Complete Puppy Curriculum', 'Week-by-week curriculum from 8 weeks to 12 months based on IGP/Schutzhund foundations — the Diedericks Dobermanns full puppy development system.', 1800.00, 2)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS video_bundle_purchases (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bundle_id   uuid NOT NULL REFERENCES video_bundles(id) ON DELETE CASCADE,
  purchased_at timestamptz DEFAULT now(),
  amount_paid numeric(10,2),
  payment_reference text,
  UNIQUE(client_id, bundle_id)
);

CREATE INDEX IF NOT EXISTS idx_bundle_purchases_client ON video_bundle_purchases(client_id);

CREATE TABLE IF NOT EXISTS training_video_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  icon        text DEFAULT 'play-circle',
  colour      text DEFAULT '#C4A35A',
  sort_order  int NOT NULL DEFAULT 0,
  is_active   boolean NOT NULL DEFAULT true
);

INSERT INTO training_video_categories (name, description, icon, colour, sort_order) VALUES
  ('Foundation Obedience', 'Core commands every Dobermann must master — sit, down, stand, and recall.', 'ribbon', '#C4A35A', 1),
  ('Protection Work', 'Phase-by-phase introduction to protection sport — from drive building to full pattern.', 'shield', '#E74C3C', 2),
  ('Socialisation & Environments', 'Building confidence and stability in real-world environments.', 'earth', '#27AE60', 3),
  ('Puppy Curriculum', 'The complete Diedericks Dobermanns development programme — week 8 to 12 months.', 'school', '#8E44AD', 4)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS training_videos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id     uuid NOT NULL REFERENCES training_video_categories(id) ON DELETE CASCADE,
  bundle_id       uuid REFERENCES video_bundles(id) ON DELETE SET NULL,
  title           text NOT NULL,
  description     text,
  video_url       text,
  thumbnail_url   text,
  duration_seconds int,
  access_tier     text NOT NULL DEFAULT 'free'
    CHECK (access_tier IN ('free', 'bundle', 'admin')),
  sort_order      int NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  week_label      text,
  tags            text[],
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_videos_category ON training_videos(category_id);
CREATE INDEX IF NOT EXISTS idx_videos_bundle    ON training_videos(bundle_id);
CREATE INDEX IF NOT EXISTS idx_videos_tier      ON training_videos(access_tier);

CREATE TABLE IF NOT EXISTS video_watch_progress (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  video_id    uuid NOT NULL REFERENCES training_videos(id) ON DELETE CASCADE,
  watched_seconds int NOT NULL DEFAULT 0,
  completed   boolean NOT NULL DEFAULT false,
  last_watched_at timestamptz DEFAULT now(),
  UNIQUE(client_id, video_id)
);

ALTER TABLE video_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_bundle_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_video_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_watch_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "video_bundles_read" ON video_bundles FOR SELECT TO authenticated USING (true);
CREATE POLICY "video_bundles_admin" ON video_bundles FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "purchases_read_own" ON video_bundle_purchases FOR SELECT TO authenticated
  USING (client_id = auth.uid() OR is_admin());
CREATE POLICY "purchases_insert" ON video_bundle_purchases FOR INSERT TO authenticated
  WITH CHECK (client_id = auth.uid() OR is_admin());
CREATE POLICY "purchases_admin" ON video_bundle_purchases FOR UPDATE TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "video_categories_read" ON training_video_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "video_categories_admin" ON training_video_categories FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "videos_read" ON training_videos FOR SELECT TO authenticated
  USING (is_active = true AND (access_tier IN ('free', 'bundle') OR is_admin()));
CREATE POLICY "videos_admin" ON training_videos FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "watch_progress_own" ON video_watch_progress FOR ALL TO authenticated
  USING (client_id = auth.uid()) WITH CHECK (client_id = auth.uid());
CREATE POLICY "watch_progress_admin" ON video_watch_progress FOR SELECT TO authenticated
  USING (is_admin());
