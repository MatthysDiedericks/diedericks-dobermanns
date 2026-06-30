import {
  endOfMonth,
  endOfYear,
  format,
  parseISO,
  startOfMonth,
  startOfYear,
  subYears,
} from 'date-fns';

import { deltaPct, periodLabel } from '@/lib/finance/formatters';
import { EXPENSE_WITH_CATEGORY } from '@/lib/finance/expenseColumns';
import { requireSupabase } from '@/lib/supabase';
import type {
  ExpenseCategory,
  ExpenseWithCategory,
  FinanceKpis,
  FinanceLine,
  FinanceReportData,
  InvoiceListRow,
  InvoiceWithDetails,
  MonthlySummary,
} from '@/types/finance';

export function yearMonthRange(year: number, month?: number) {
  if (month === undefined || month < 0) {
    const from = format(startOfYear(new Date(year, 0, 1)), 'yyyy-MM-dd');
    const to = format(endOfYear(new Date(year, 0, 1)), 'yyyy-MM-dd');
    return { from, to };
  }
  const from = format(startOfMonth(new Date(year, month, 1)), 'yyyy-MM-dd');
  const to = format(endOfMonth(new Date(year, month, 1)), 'yyyy-MM-dd');
  return { from, to };
}

export function priorPeriodRange(from: string, to: string) {
  const fromDate = parseISO(from);
  const toDate = parseISO(to);
  const priorFrom = format(subYears(fromDate, 1), 'yyyy-MM-dd');
  const priorTo = format(subYears(toDate, 1), 'yyyy-MM-dd');
  return { priorFrom, priorTo };
}

export async function fetchExpenseCategories(): Promise<ExpenseCategory[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('expense_categories')
    .select('*')
    .order('sort_order');
  if (error) throw new Error(error.message);
  return (data ?? []) as ExpenseCategory[];
}

export async function fetchInvoicesInRange(from: string, to: string) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('invoices')
    .select('*, client:users!invoices_client_id_fkey(full_name, email), dog:dogs(name)')
    .gte('issue_date', from)
    .lte('issue_date', to)
    .order('issue_date', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? [])
    .filter((i) => i.status !== 'void' && i.status !== 'cancelled')
    .map((row) => row as unknown as InvoiceListRow);
}

export async function fetchAllInvoices(statusFilter?: string) {
  const supabase = requireSupabase();
  let query = supabase
    .from('invoices')
    .select('*, client:users!invoices_client_id_fkey(full_name, email), dog:dogs(name)')
    .order('issue_date', { ascending: false });

  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as InvoiceListRow[];
}

export async function fetchInvoiceById(id: string): Promise<InvoiceWithDetails> {
  const supabase = requireSupabase();
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('*, client:users!invoices_client_id_fkey(full_name, email, phone), dog:dogs(name)')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);

  const { data: items } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', id)
    .order('sort_order');

  const { data: payments } = await supabase
    .from('invoice_payments')
    .select('*')
    .eq('invoice_id', id)
    .order('payment_date', { ascending: false });

  const row = invoice as unknown as InvoiceListRow & {
    client?: { full_name: string | null; email: string | null; phone?: string | null } | null;
  };

  return {
    ...(row as InvoiceWithDetails),
    clientName: row.client?.full_name ?? '—',
    clientEmail: row.client?.email ?? '',
    clientPhone: row.client?.phone ?? null,
    dogName: row.dog?.name ?? null,
    items: (items ?? []) as InvoiceWithDetails['items'],
    payments: (payments ?? []) as InvoiceWithDetails['payments'],
  };
}

export async function fetchClientInvoices(clientId: string) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('invoices')
    .select('*, dog:dogs(name)')
    .eq('client_id', clientId)
    .neq('status', 'void')
    .order('issue_date', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as InvoiceListRow[];
}

export async function fetchExpensesInRange(from: string, to: string) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('expenses')
    .select(`${EXPENSE_WITH_CATEGORY}, dog:dogs(name)`)
    .gte('expense_date', from)
    .lte('expense_date', to)
    .order('expense_date', { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const cat = r.category as { name: string; colour: string } | null;
    const dog = r.dog as { name: string } | null;
    return {
      ...(r as unknown as ExpenseWithCategory),
      categoryName: cat?.name ?? 'Other',
      categoryColour: cat?.colour ?? '#888888',
      dogName: dog?.name ?? null,
    };
  });
}

export async function fetchAllExpenses(categoryId?: string) {
  const supabase = requireSupabase();
  let query = supabase
    .from('expenses')
    .select(EXPENSE_WITH_CATEGORY)
    .order('expense_date', { ascending: false });

  if (categoryId && categoryId !== 'all') {
    query = query.eq('category_id', categoryId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const cat = r.category as { name: string; colour: string } | null;
    return {
      ...(r as unknown as ExpenseWithCategory),
      categoryName: cat?.name ?? 'Other',
      categoryColour: cat?.colour ?? '#888888',
    };
  });
}

export async function fetchIncomeByItemType(from: string, to: string) {
  const supabase = requireSupabase();
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, status')
    .gte('issue_date', from)
    .lte('issue_date', to);

  const ids = (invoices ?? [])
    .filter((i) => i.status !== 'void' && i.status !== 'cancelled')
    .map((i) => i.id);
  if (ids.length === 0) return [] as FinanceLine[];

  const { data: items } = await supabase
    .from('invoice_items')
    .select('item_type, line_total')
    .in('invoice_id', ids);

  const map = new Map<string, number>();
  (items ?? []).forEach((item) => {
    const key = item.item_type ?? 'other';
    map.set(key, (map.get(key) ?? 0) + Number(item.line_total ?? 0));
  });

  return [...map.entries()]
    .map(([label, amount]) => ({
      label: label.replace(/_/g, ' '),
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export async function computeKpis(from: string, to: string): Promise<FinanceKpis> {
  const invoices = await fetchInvoicesInRange(from, to);
  const expenses = await fetchExpensesInRange(from, to);
  const { priorFrom, priorTo } = priorPeriodRange(from, to);
  const priorInvoices = await fetchInvoicesInRange(priorFrom, priorTo);
  const priorExpenses = await fetchExpensesInRange(priorFrom, priorTo);

  const totalIncome = invoices.reduce((s, i) => s + Number(i.amount_paid ?? 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount ?? 0), 0);
  const netProfit = totalIncome - totalExpenses;
  const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

  const priorIncome = priorInvoices.reduce((s, i) => s + Number(i.amount_paid ?? 0), 0);
  const priorExpenseTotal = priorExpenses.reduce((s, e) => s + Number(e.amount ?? 0), 0);
  const priorProfit = priorIncome - priorExpenseTotal;

  return {
    totalIncome,
    totalExpenses,
    netProfit,
    profitMargin,
    incomeDeltaPct: deltaPct(totalIncome, priorIncome),
    expenseDeltaPct: deltaPct(totalExpenses, priorExpenseTotal),
    profitDeltaPct: deltaPct(netProfit, priorProfit),
  };
}

export async function buildMonthlySummary(year: number): Promise<MonthlySummary[]> {
  const months: MonthlySummary[] = [];
  for (let m = 0; m < 12; m++) {
    const { from, to } = yearMonthRange(year, m);
    const invoices = await fetchInvoicesInRange(from, to);
    const expenses = await fetchExpensesInRange(from, to);
    months.push({
      month: format(new Date(year, m, 1), 'MMM'),
      income: invoices.reduce((s, i) => s + Number(i.amount_paid ?? 0), 0),
      expenses: expenses.reduce((s, e) => s + Number(e.amount ?? 0), 0),
    });
  }
  return months;
}

export async function buildFinanceReport(from: string, to: string): Promise<FinanceReportData> {
  const invoices = await fetchInvoicesInRange(from, to);
  const expenses = await fetchExpensesInRange(from, to);
  const incomeByType = await fetchIncomeByItemType(from, to);

  const expenseByCategory = new Map<string, number>();
  expenses.forEach((e) => {
    const name = e.categoryName ?? 'Other';
    expenseByCategory.set(name, (expenseByCategory.get(name) ?? 0) + Number(e.amount));
  });

  const expenseLines: FinanceLine[] = [...expenseByCategory.entries()]
    .map(([label, amount]) => ({ label, amount }))
    .sort((a, b) => b.amount - a.amount);

  const totalIncome = invoices.reduce((s, i) => s + Number(i.amount_paid ?? 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount ?? 0), 0);
  const netProfit = totalIncome - totalExpenses;

  const year = parseISO(from).getFullYear();
  const monthlySummary = await buildMonthlySummary(year);

  return {
    periodLabel: periodLabel(from, to),
    from,
    to,
    incomeLines: incomeByType,
    expenseLines,
    totalIncome,
    totalExpenses,
    netProfit,
    profitMargin: totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0,
    monthlySummary,
    invoices: invoices.map((i) => ({
      invoice_number: i.invoice_number,
      clientName: i.client?.full_name ?? '—',
      dogName: i.dog?.name ?? null,
      issue_date: i.issue_date,
      total_amount: Number(i.total_amount),
      amount_paid: Number(i.amount_paid),
      amount_outstanding: Number(i.amount_outstanding),
      status: i.status,
    })),
    expenses: expenses.map((e) => ({
      expense_date: e.expense_date,
      categoryName: e.categoryName,
      description: e.description,
      supplier_name: e.supplier_name,
      amount: Number(e.amount),
      dogName: e.dogName,
      is_recurring: e.is_recurring,
    })),
  };
}
