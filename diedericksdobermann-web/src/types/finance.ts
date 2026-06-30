/** Finance domain types — aligned with live Supabase finance schema. */

export type InvoiceStatus =
  | "draft"
  | "sent"
  | "partially_paid"
  | "paid"
  | "overdue"
  | "void"
  | "cancelled";

export type InvoiceItemType =
  | "dog_sale"
  | "deposit"
  | "training_fee"
  | "transport"
  | "other";

export interface ExpenseCategory {
  id: string;
  name: string;
  colour: string;
  sort_order: number;
  created_at: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string | null;
  reservation_id: string | null;
  dog_id: string | null;
  litter_id: string | null;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  amount_paid: number;
  amount_outstanding: number;
  paid_date: string | null;
  notes: string | null;
  internal_notes: string | null;
  currency: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  item_type: InvoiceItemType;
  quantity: number;
  unit_price: number;
  line_total: number;
  sort_order: number;
}

export interface InvoicePayment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  payment_method: string | null;
  reference: string | null;
  notes: string | null;
  recorded_by: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  category_id: string;
  description: string;
  amount: number;
  expense_date: string;
  supplier_name: string | null;
  invoice_reference: string | null;
  dog_id: string | null;
  litter_id: string | null;
  receipt_url: string | null;
  is_recurring: boolean;
  recurring_interval: string | null;
  recurring_end_date: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type InvoiceWithDetails = Invoice & {
  clientName: string;
  clientEmail: string;
  clientPhone?: string | null;
  dogName?: string | null;
  items: InvoiceItem[];
  payments: InvoicePayment[];
};

export type ExpenseWithCategory = Expense & {
  categoryName: string;
  categoryColour: string;
  dogName?: string | null;
};

export type InvoiceListRow = Invoice & {
  client?: { full_name: string | null } | null;
  dog?: { name: string } | null;
};

export interface FinanceLine {
  label: string;
  amount: number;
}

export interface MonthlySummary {
  month: string;
  income: number;
  expenses: number;
}

export interface FinanceReportData {
  periodLabel: string;
  from: string;
  to: string;
  incomeLines: FinanceLine[];
  expenseLines: FinanceLine[];
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  monthlySummary: MonthlySummary[];
  invoices: Array<{
    invoice_number: string;
    clientName: string;
    dogName?: string | null;
    issue_date: string;
    total_amount: number;
    amount_paid: number;
    amount_outstanding: number;
    status: string;
  }>;
  expenses: Array<{
    expense_date: string;
    categoryName: string;
    description: string;
    supplier_name?: string | null;
    amount: number;
    dogName?: string | null;
    is_recurring: boolean;
  }>;
}

export interface FinanceKpis {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  incomeDeltaPct: number | null;
  expenseDeltaPct: number | null;
  profitDeltaPct: number | null;
}
