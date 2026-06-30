-- 0023 — Annual and monthly budget targets per expense category

CREATE TABLE IF NOT EXISTS budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year int NOT NULL,
  month int CHECK (month BETWEEN 1 AND 12),
  category_id uuid REFERENCES expense_categories(id) ON DELETE CASCADE,
  label text,
  budget_type text NOT NULL DEFAULT 'expense'
    CHECK (budget_type IN ('expense', 'income', 'total')),
  budgeted_amount numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_budgets_unique
  ON budgets(year, COALESCE(month, 0), COALESCE(category_id, '00000000-0000-0000-0000-000000000000'::uuid), budget_type);

CREATE INDEX IF NOT EXISTS idx_budgets_year ON budgets(year);
CREATE INDEX IF NOT EXISTS idx_budgets_category ON budgets(category_id);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage budgets"
  ON budgets FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "Trainers can read budgets"
  ON budgets FOR SELECT USING (is_trainer_or_above());
