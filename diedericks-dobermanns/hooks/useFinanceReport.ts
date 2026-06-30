import { useCallback, useEffect, useState } from 'react';

import {
  buildFinanceReport,
  computeKpis,
  fetchIncomeByItemType,
  fetchInvoicesInRange,
  fetchExpensesInRange,
  buildMonthlySummary,
} from '@/lib/finance/queries';
import type { FinanceKpis, FinanceLine, FinanceReportData, MonthlySummary } from '@/types/finance';
import type { InvoiceListRow } from '@/types/finance';
import type { ExpenseWithCategory } from '@/types/finance';

export function useFinanceReport(from: string, to: string) {
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [kpis, setKpis] = useState<FinanceKpis | null>(null);
  const [invoices, setInvoices] = useState<InvoiceListRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseWithCategory[]>([]);
  const [incomeByType, setIncomeByType] = useState<FinanceLine[]>([]);
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary[]>([]);
  const [report, setReport] = useState<FinanceReportData | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [k, inv, exp, income, monthly] = await Promise.all([
        computeKpis(from, to),
        fetchInvoicesInRange(from, to),
        fetchExpensesInRange(from, to),
        fetchIncomeByItemType(from, to),
        buildMonthlySummary(new Date(from).getFullYear()),
      ]);
      setKpis(k);
      setInvoices(inv);
      setExpenses(exp);
      setIncomeByType(income);
      setMonthlySummary(monthly);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load finance data');
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await buildFinanceReport(from, to);
      setReport(data);
      return data;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to build report');
      return null;
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const totalIncome = kpis?.totalIncome ?? 0;
  const totalExpenses = kpis?.totalExpenses ?? 0;
  const netProfit = kpis?.netProfit ?? 0;
  const profitMargin = kpis?.profitMargin ?? 0;

  return {
    invoices,
    expenses,
    incomeByType,
    expenseByCategory: expenses.reduce<FinanceLine[]>((acc, e) => {
      const existing = acc.find((l) => l.label === e.categoryName);
      if (existing) existing.amount += Number(e.amount);
      else acc.push({ label: e.categoryName, amount: Number(e.amount) });
      return acc;
    }, []),
    monthlySummary,
    totalIncome,
    totalExpenses,
    netProfit,
    profitMargin,
    priorPeriodComparison: kpis,
    isLoading,
    error,
    refresh: load,
    loadReport,
    report,
  };
}
