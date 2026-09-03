import {
  endOfMonth,
  endOfYear,
  format,
  parseISO,
  startOfMonth,
  startOfYear,
  subYears,
} from 'date-fns';

import { fetchInvoicePayments } from '@/lib/finance/clientPayments';
import { expenseGross } from '@/lib/finance/expenseGross';
import { deltaPct } from '@/lib/finance/formatters';
import { EXPENSE_CATEGORY_COLUMNS, EXPENSE_WITH_CATEGORY } from '@/lib/finance/expenseColumns';
import { requireSupabase } from '@/lib/supabase';
import type {
  ExpenseCategory,
  ExpenseWithCategory,
  FinanceKpis,
  FinanceLine,
  InvoiceListRow,
  InvoiceWithDetails,
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
    .select(EXPENSE_CATEGORY_COLUMNS)
    .order('sort_order');
  if (error) throw new Error(error.message);
  return (data ?? []) as ExpenseCategory[];
}

/** Quick-add a new expense category — used by the budget screen and, later, anywhere else. */
export async function createExpenseCategory(name: string, colour: string): Promise<ExpenseCategory> {
  const supabase = requireSupabase();
  const { data: existing } = await supabase
    .from('expense_categories')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  const sort_order = ((existing?.sort_order as number | undefined) ?? 0) + 10;

  const { data, error } = await supabase
    .from('expense_categories')
    .insert({ name, colour, sort_order })
    .select(EXPENSE_CATEGORY_COLUMNS)
    .single();
  if (error) throw new Error(error.message);
  return data as ExpenseCategory;
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
    .select('id, invoice_id, description, item_type, quantity, unit_price, line_total, sort_order')
    .eq('invoice_id', id)
    .order('sort_order');

  const mappedPayments = await fetchInvoicePayments(id);

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
    payments: mappedPayments,
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
  const totalExpenses = expenses.reduce((s, e) => s + expenseGross(e), 0);
  const netProfit = totalIncome - totalExpenses;
  const profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

  const priorIncome = priorInvoices.reduce((s, i) => s + Number(i.amount_paid ?? 0), 0);
  const priorExpenseTotal = priorExpenses.reduce((s, e) => s + expenseGross(e), 0);
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
