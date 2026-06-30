-- 0025 — Creditor (accounts payable) tracking

-- Add payable fields to expenses — marks an expense as "we owe this supplier"
ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS is_payable boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payable_due_date date,
  ADD COLUMN IF NOT EXISTS payable_paid_date date,
  ADD COLUMN IF NOT EXISTS creditor_name text;

CREATE INDEX IF NOT EXISTS idx_expenses_payable
  ON expenses(is_payable, payable_paid_date)
  WHERE is_payable = true;
