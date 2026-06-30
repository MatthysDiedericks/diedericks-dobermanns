/** Explicit expense columns — avoid SELECT * in finance queries. */
export const EXPENSE_COLUMNS =
  'id, category_id, description, amount, currency, expense_date, dog_id, litter_id, is_recurring, recurrence_interval, recurrence_end_date, receipt_url, supplier_name, invoice_reference, status, notes, recorded_by, created_at, updated_at, price_excl_vat, vat_applicable, vat_rate, vat_amount, payment_account_id, payment_account_name, allocation_type, is_payable, payable_due_date, payable_paid_date, creditor_name';

export const EXPENSE_WITH_CATEGORY =
  `${EXPENSE_COLUMNS}, category:expense_categories(name, colour)`;
