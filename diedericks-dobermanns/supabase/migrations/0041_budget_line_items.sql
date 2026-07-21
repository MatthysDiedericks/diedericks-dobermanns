-- 0041 — Sub-budget line items (e.g. individual staff under "Salaries"). A category
-- with no line items keeps using the existing flat `budgets.budgeted_amount` — this
-- table is purely additive/opt-in per category per year.
CREATE TABLE IF NOT EXISTS budget_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES expense_categories(id) ON DELETE CASCADE,
  year int NOT NULL,
  -- NULL = recurring: this amount applies unchanged to every month of `year`.
  -- Set to 1-12 = one-off: this amount applies only to that specific month
  -- (e.g. a December bonus), on top of any recurring items.
  month int CHECK (month BETWEEN 1 AND 12),
  name text NOT NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_budget_line_items_category_year
  ON budget_line_items(category_id, year);

ALTER TABLE budget_line_items ENABLE ROW LEVEL SECURITY;

-- Admin-only, both read and write — deliberately stricter than the `budgets` table,
-- which trainers can read. Individual staff amounts are more sensitive than a
-- category total.
CREATE POLICY "Admins manage budget line items"
  ON budget_line_items FOR ALL USING (is_admin()) WITH CHECK (is_admin());
