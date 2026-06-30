import { useCallback, useEffect, useState } from 'react';

import { fetchBudgetsForYear, sumBudgetAmount } from '@/lib/finance/budgetQueries';
import { fetchExpensesInRange, fetchInvoicesInRange, yearMonthRange } from '@/lib/finance/queries';
import type { BudgetSummary } from '@/types/finance';

export function useBudgetSummary(year: number) {
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { from, to } = yearMonthRange(year);
      const [budgets, expenses, invoices] = await Promise.all([
        fetchBudgetsForYear(year),
        fetchExpensesInRange(from, to),
        fetchInvoicesInRange(from, to),
      ]);
      const totalExpenseBudget = sumBudgetAmount(budgets, 'expense');
      const totalIncomeTarget = sumBudgetAmount(budgets, 'income');
      const totalExpensesActual = expenses.reduce((s, e) => s + Number(e.amount), 0);
      const totalIncomeActual = invoices.reduce((s, i) => s + Number(i.amount_paid ?? 0), 0);
      const budgetUsedPct =
        totalExpenseBudget > 0 ? (totalExpensesActual / totalExpenseBudget) * 100 : 0;

      setSummary({
        year,
        totalExpenseBudget,
        totalIncomeTarget,
        totalExpensesActual,
        totalIncomeActual,
        budgetUsedPct,
      });
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    void load();
  }, [load]);

  return { summary, loading, refresh: load };
}
