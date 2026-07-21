import { useCallback, useEffect, useMemo, useState } from 'react';
import { parseISO } from 'date-fns';

import {
  budgetForCategoryMonth,
  deleteBudgetLineItem,
  deleteBudgetsForYear,
  fetchAllBudgetLineItemsForYear,
  fetchBudgetsForYear,
  sumBudgetAmount,
  upsertBudgetLineItem,
  upsertBudgetRow,
} from '@/lib/finance/budgetQueries';
import { fetchExpenseCategories, fetchExpensesInRange, yearMonthRange } from '@/lib/finance/queries';
import { showError, showSaved } from '@/lib/dogDetail/feedback';
import type {
  BudgetLineItem,
  BudgetRow,
  ExpenseCategory,
  ExpenseWithCategory,
  UpsertBudgetInput,
  UpsertBudgetLineItemInput,
} from '@/types/finance';

export function useBudgets(year: number) {
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [lineItems, setLineItems] = useState<BudgetLineItem[]>([]);
  const [actualByCategory, setActualByCategory] = useState<Map<string, number>>(new Map());
  const [expenses, setExpenses] = useState<ExpenseWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { from, to } = yearMonthRange(year);
      const [rows, cats, expenses, items] = await Promise.all([
        fetchBudgetsForYear(year),
        fetchExpenseCategories(),
        fetchExpensesInRange(from, to),
        fetchAllBudgetLineItemsForYear(year),
      ]);
      setBudgets(rows);
      setCategories(cats);
      setExpenses(expenses);
      setLineItems(items);
      const map = new Map<string, number>();
      expenses.forEach((e) => {
        map.set(e.category_id, (map.get(e.category_id) ?? 0) + Number(e.amount));
      });
      setActualByCategory(map);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load budgets');
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    void load();
  }, [load]);

  const upsertBudget = useCallback(
    async (input: UpsertBudgetInput) => {
      try {
        await upsertBudgetRow(input);
        await load();
      } catch (e) {
        showError('Could not save budget.');
        throw e;
      }
    },
    [load],
  );

  const saveMany = useCallback(
    async (inputs: UpsertBudgetInput[]) => {
      try {
        for (const input of inputs) {
          if (input.budgeted_amount > 0) await upsertBudgetRow(input);
        }
        showSaved('Budget saved');
        await load();
      } catch (e) {
        showError('Could not save budget.');
        console.error('[useBudgets.saveMany]', e);
      }
    },
    [load],
  );

  const saveLineItem = useCallback(
    async (input: UpsertBudgetLineItemInput) => {
      await upsertBudgetLineItem(input);
      await load();
    },
    [load],
  );

  const deleteLineItem = useCallback(
    async (id: string) => {
      await deleteBudgetLineItem(id);
      await load();
    },
    [load],
  );

  const deleteAllForYear = useCallback(async () => {
    try {
      await deleteBudgetsForYear(year);
      setBudgets([]);
      showSaved('Budget cleared for year');
    } catch (e) {
      showError('Could not clear budget.');
    }
  }, [year]);

  const annualTotal = useCallback(
    (budgetType: BudgetRow['budget_type']) => sumBudgetAmount(budgets, budgetType),
    [budgets],
  );

  const monthlyBreakdown = useCallback(
    (categoryId: string) =>
      Array.from({ length: 12 }, (_, i) => {
        const month = i + 1;
        return budgets.find(
          (b) =>
            b.category_id === categoryId && b.budget_type === 'expense' && b.month === month,
        );
      }),
    [budgets],
  );

  const actualForCategory = useCallback(
    (categoryId: string, month: number | null) =>
      expenses
        .filter((e) => {
          if (e.category_id !== categoryId) return false;
          if (month == null) return true;
          return parseISO(e.expense_date).getMonth() + 1 === month;
        })
        .reduce((s, e) => s + Number(e.amount), 0),
    [expenses],
  );

  const lineItemsForCategory = useCallback(
    (categoryId: string) => lineItems.filter((i) => i.category_id === categoryId),
    [lineItems],
  );

  const isItemized = useCallback(
    (categoryId: string) => lineItems.some((i) => i.category_id === categoryId),
    [lineItems],
  );

  const categoryRows = useMemo(
    () =>
      categories.map((cat) => ({
        category: cat,
        budgeted: budgetForCategoryMonth(budgets, lineItems, cat.id, null),
        actual: actualByCategory.get(cat.id) ?? 0,
      })),
    [categories, budgets, lineItems, actualByCategory],
  );

  return {
    budgets,
    categories,
    categoryRows,
    lineItems,
    actualByCategory,
    loading,
    error,
    refresh: load,
    upsertBudget,
    saveMany,
    saveLineItem,
    deleteLineItem,
    lineItemsForCategory,
    isItemized,
    deleteAllForYear,
    annualTotal,
    monthlyBreakdown,
    budgetForCategoryMonth: (categoryId: string, month: number | null) =>
      budgetForCategoryMonth(budgets, lineItems, categoryId, month),
    actualForCategory,
  };
}
