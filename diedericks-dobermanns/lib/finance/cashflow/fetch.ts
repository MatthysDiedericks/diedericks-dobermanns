import { requireSupabase } from '@/lib/supabase';

import { expenseGross } from '../expenseGross';
import type { InvoiceLines } from './build';
import type {
  BudgetMonthRow,
  DepositHeldRow,
  ExpectedInRow,
  ExpenseCashRow,
  ReceiptRow,
} from './types';

export type CashflowInputs = {
  receipts: ReceiptRow[];
  expectedIn: ExpectedInRow[];
  expenses: ExpenseCashRow[];
  budgets: BudgetMonthRow[];
  depositRows: DepositHeldRow[];
  invoiceLines: InvoiceLines;
  litterNames: Record<string, string>;
};

function num(v: unknown): number {
  return Number(v ?? 0) || 0;
}

export async function fetchCashflowInputs(): Promise<CashflowInputs> {
  const supabase = requireSupabase();

  const [
    receiptsRes,
    expectedRes,
    depositsRes,
    littersRes,
    expensesRes,
    budgetsRes,
  ] = await Promise.all([
    supabase.from('v_cash_receipts').select('*').order('received_on', { ascending: false }).limit(5000),
    supabase.from('v_cash_expected_in').select('*').limit(2000),
    supabase.from('v_deposits_held').select('*').limit(500),
    supabase.from('v_litter_go_home').select('*').limit(500),
    supabase
      .from('expenses')
      .select(
        'id, expense_date, amount, amount_gross, vat_amount, description, category_id, payment_account_id, litter_id, is_payable, payable_due_date, payable_paid_date, is_recurring, recurrence_interval, recurrence_end_date, category:expense_categories(name)',
      )
      .order('expense_date', { ascending: false })
      .limit(5000),
    supabase
      .from('budgets')
      .select('year, month, category_id, budgeted_amount, budget_type, category:expense_categories(name)')
      .limit(2000),
  ]);

  const firstErr =
    receiptsRes.error ??
    expectedRes.error ??
    depositsRes.error ??
    littersRes.error ??
    expensesRes.error ??
    budgetsRes.error;
  if (firstErr) throw new Error(firstErr.message);

  const receipts = (receiptsRes.data ?? []) as ReceiptRow[];
  const invoiceIds = [...new Set(receipts.map((r) => r.invoice_id).filter(Boolean))] as string[];
  const invoiceLines: InvoiceLines = {};
  if (invoiceIds.length > 0) {
    const { data: lines, error: linesErr } = await supabase
      .from('invoice_items')
      .select('invoice_id, item_type, line_total')
      .in('invoice_id', invoiceIds);
    if (linesErr) throw new Error(linesErr.message);
    for (const line of lines ?? []) {
      const id = String(line.invoice_id);
      if (!invoiceLines[id]) invoiceLines[id] = [];
      invoiceLines[id].push({
        item_type: String(line.item_type ?? ''),
        line_total: num(line.line_total),
      });
    }
  }

  const litterNames: Record<string, string> = {};
  for (const row of littersRes.data ?? []) {
    if (row.litter_id) litterNames[row.litter_id] = row.pairing ?? String(row.litter_id).slice(0, 8);
  }

  const expenses: ExpenseCashRow[] = (expensesRes.data ?? []).map((row: Record<string, unknown>) => {
    const cat = row.category as { name: string } | null;
    return {
      id: String(row.id),
      expense_date: String(row.expense_date),
      amount: expenseGross({
        amount: num(row.amount),
        vat_amount: num(row.vat_amount),
        amount_gross: row.amount_gross == null ? null : num(row.amount_gross),
      }),
      description: String(row.description ?? ''),
      category_id: (row.category_id as string | null) ?? null,
      category_name: cat?.name ?? 'Other',
      payment_account_id: (row.payment_account_id as string | null) ?? null,
      litter_id: (row.litter_id as string | null) ?? null,
      is_payable: Boolean(row.is_payable),
      payable_due_date: (row.payable_due_date as string | null) ?? null,
      payable_paid_date: (row.payable_paid_date as string | null) ?? null,
      is_recurring: Boolean(row.is_recurring),
      recurrence_interval: (row.recurrence_interval as string | null) ?? null,
      recurrence_end_date: (row.recurrence_end_date as string | null) ?? null,
    };
  });

  const budgets: BudgetMonthRow[] = (budgetsRes.data ?? []).map((row: Record<string, unknown>) => {
    const cat = row.category as { name: string } | null;
    return {
      year: num(row.year),
      month: row.month == null ? null : num(row.month),
      category_id: (row.category_id as string | null) ?? null,
      category_name: cat?.name ?? 'Other',
      budgeted_amount: num(row.budgeted_amount),
      budget_type: String(row.budget_type ?? 'expense'),
    };
  });

  return {
    receipts,
    expectedIn: (expectedRes.data ?? []) as ExpectedInRow[],
    expenses,
    budgets,
    depositRows: (depositsRes.data ?? []) as DepositHeldRow[],
    invoiceLines,
    litterNames,
  };
}
