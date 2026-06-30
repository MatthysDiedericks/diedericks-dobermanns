-- 0026 — Expense upgrade: VAT breakdown, payment accounts, allocation type

CREATE TABLE IF NOT EXISTS payment_accounts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  account_type text NOT NULL DEFAULT 'bank'
    CHECK (account_type IN ('bank', 'card', 'cash', 'other')),
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz DEFAULT now()
);

INSERT INTO payment_accounts (name, account_type, sort_order) VALUES
  ('FNB Business Account', 'bank', 1),
  ('FNB Savings Account',  'bank', 2),
  ('Petty Cash',           'cash', 3),
  ('Credit Card',          'card', 4)
ON CONFLICT DO NOTHING;

ALTER TABLE payment_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "payment_accounts_read" ON payment_accounts
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "payment_accounts_admin_write" ON payment_accounts
  FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS price_excl_vat    numeric(12,2),
  ADD COLUMN IF NOT EXISTS vat_applicable    boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS vat_rate          numeric(5,2) DEFAULT 15,
  ADD COLUMN IF NOT EXISTS vat_amount        numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS payment_account_id uuid REFERENCES payment_accounts(id),
  ADD COLUMN IF NOT EXISTS payment_account_name text,
  ADD COLUMN IF NOT EXISTS allocation_type   text NOT NULL DEFAULT 'general'
    CHECK (allocation_type IN ('general', 'dog', 'litter'));

UPDATE expenses SET price_excl_vat = amount WHERE price_excl_vat IS NULL;

CREATE INDEX IF NOT EXISTS idx_expenses_dog_id    ON expenses(dog_id)    WHERE dog_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_litter_id ON expenses(litter_id) WHERE litter_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_alloc     ON expenses(allocation_type);
