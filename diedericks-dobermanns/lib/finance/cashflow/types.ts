export type ReceiptRow = {
  id: string;
  source: string;
  received_on: string;
  amount: number;
  method: string | null;
  invoice_id: string | null;
  invoice_number: string | null;
  client_id: string | null;
  buyer_name: string | null;
  dog_id: string | null;
  litter_id: string | null;
};

export type ExpectedInRow = {
  invoice_id: string;
  invoice_number: string;
  client_id: string | null;
  buyer_name: string;
  amount: number;
  due_date: string | null;
  dog_id: string | null;
  litter_id: string | null;
  quote_id: string | null;
  dog_name: string | null;
  expected_date: string | null;
  date_basis: string;
  basis_label: string;
  litter_label: string | null;
};

export type DepositHeldRow = {
  invoice_id: string;
  invoice_number: string;
  buyer_name: string | null;
  amount_paid: number;
  amount_outstanding: number;
  dog_name: string | null;
};

export type ExpenseCashRow = {
  id: string;
  expense_date: string;
  amount: number;
  description: string;
  category_id: string | null;
  category_name: string;
  payment_account_id: string | null;
  litter_id: string | null;
  is_payable: boolean;
  payable_due_date: string | null;
  payable_paid_date: string | null;
  is_recurring: boolean;
  recurrence_interval: string | null;
  recurrence_end_date: string | null;
};

export type BudgetMonthRow = {
  year: number;
  month: number | null;
  category_id: string | null;
  category_name: string;
  budgeted_amount: number;
  budget_type: string;
};

export type MonthBucket = {
  key: string;
  label: string;
  actualIn: number;
  actualOut: number;
  actualNet: number;
  forecastIn: number;
  forecastOut: number;
  forecastNet: number;
  budgetOut: number;
  cumulativeActual: number;
  rolling12: number;
};

export type CashflowSummary = {
  receivedThisMonth: number;
  expectedNext30: number;
  netThisMonth: number;
  depositsHeld: number;
  trough: { key: string; depth: number } | null;
};
