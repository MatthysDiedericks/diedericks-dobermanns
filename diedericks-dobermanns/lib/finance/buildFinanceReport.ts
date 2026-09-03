import { format, parseISO } from 'date-fns';

import { expenseGross } from '@/lib/finance/expenseGross';
import { periodLabel } from '@/lib/finance/formatters';
import {
  fetchExpensesInRange,
  fetchIncomeByItemType,
  fetchInvoicesInRange,
  yearMonthRange,
} from '@/lib/finance/queries';
import { splitRevenueByType } from '@/lib/finance/quoteTypes';
import type { FinanceLine, FinanceReportData, MonthlySummary } from '@/types/finance';

export async function buildMonthlySummary(year: number): Promise<MonthlySummary[]> {
  const months: MonthlySummary[] = [];
  for (let m = 0; m < 12; m++) {
    const { from, to } = yearMonthRange(year, m);
    const invoices = await fetchInvoicesInRange(from, to);
    const expenses = await fetchExpensesInRange(from, to);
    months.push({
      month: format(new Date(year, m, 1), 'MMM'),
      income: invoices.reduce((s, i) => s + Number(i.amount_paid ?? 0), 0),
      expenses: expenses.reduce((s, e) => s + expenseGross(e), 0),
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
    expenseByCategory.set(name, (expenseByCategory.get(name) ?? 0) + expenseGross(e));
  });

  const expenseLines: FinanceLine[] = [...expenseByCategory.entries()]
    .map(([label, amount]) => ({ label, amount }))
    .sort((a, b) => b.amount - a.amount);

  const totalIncome = invoices.reduce((s, i) => s + Number(i.amount_paid ?? 0), 0);
  const totalExpenses = expenses.reduce((s, e) => s + expenseGross(e), 0);
  const netProfit = totalIncome - totalExpenses;
  const year = parseISO(from).getFullYear();

  return {
    periodLabel: periodLabel(from, to),
    from,
    to,
    incomeLines: incomeByType,
    incomeByInvoiceType: splitRevenueByType(invoices),
    expenseLines,
    totalIncome,
    totalExpenses,
    netProfit,
    profitMargin: totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0,
    monthlySummary: await buildMonthlySummary(year),
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
      amount: expenseGross(e),
      dogName: e.dogName,
      is_recurring: e.is_recurring,
    })),
  };
}
