import { useCallback, useEffect, useState } from 'react';

import { EXPENSE_WITH_CATEGORY } from '@/lib/finance/expenseColumns';
import { expenseGross } from '@/lib/finance/expenseGross';
import {
  createExpense,
  deleteExpense,
  fetchExpenseById,
  mapExpenseRow,
  updateExpense,
  type AllocationType,
  type CreateExpenseInput,
} from '@/lib/finance/expenseMutations';
import {
  fetchAllExpenses,
  fetchExpenseCategories,
} from '@/lib/finance/queries';
import { requireSupabase } from '@/lib/supabase';
import type { ExpenseCategory, ExpenseWithCategory } from '@/types/finance';

export type { AllocationType, CreateExpenseInput };
export { createExpense, deleteExpense, fetchExpenseById, updateExpense };

export function useExpenses(categoryId?: string) {
  const [data, setData] = useState<ExpenseWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchAllExpenses(categoryId);
      setData(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useExpenseCategories() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExpenseCategories()
      .then(setCategories)
      .finally(() => setLoading(false));
  }, []);

  return { categories, loading };
}

export function useExpensesByDog(dogId: string | undefined) {
  const [data, setData] = useState<ExpenseWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);

  const refresh = useCallback(async () => {
    if (!dogId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const supabase = requireSupabase();
      const { data: rows, error } = await supabase
        .from('expenses')
        .select(EXPENSE_WITH_CATEGORY)
        .eq('dog_id', dogId)
        .order('expense_date', { ascending: false });
      if (error) throw new Error(error.message);
      const mapped = (rows ?? []).map((r) => mapExpenseRow(r as Record<string, unknown>));
      setData(mapped);
      setTotalAmount(mapped.reduce((sum, r) => sum + expenseGross(r), 0));
    } catch (e) {
      console.error('[useExpensesByDog]', e);
    } finally {
      setLoading(false);
    }
  }, [dogId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, totalAmount, loading, refresh };
}

export function useExpensesByLitter(litterId: string | undefined) {
  const [data, setData] = useState<ExpenseWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);

  const refresh = useCallback(async () => {
    if (!litterId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const supabase = requireSupabase();
      const { data: rows, error } = await supabase
        .from('expenses')
        .select(EXPENSE_WITH_CATEGORY)
        .eq('litter_id', litterId)
        .order('expense_date', { ascending: false });
      if (error) throw new Error(error.message);
      const mapped = (rows ?? []).map((r) => mapExpenseRow(r as Record<string, unknown>));
      setData(mapped);
      setTotalAmount(mapped.reduce((sum, r) => sum + expenseGross(r), 0));
    } catch (e) {
      console.error('[useExpensesByLitter]', e);
    } finally {
      setLoading(false);
    }
  }, [litterId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, totalAmount, loading, refresh };
}

export function usePaymentAccounts() {
  const [accounts, setAccounts] = useState<{ id: string; name: string; account_type: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = requireSupabase();
    void supabase
      .from('payment_accounts')
      .select('id, name, account_type')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data, error }) => {
        if (!error) setAccounts(data ?? []);
        setLoading(false);
      });
  }, []);

  return { accounts, loading };
}

export function useVatExpenseSummary(from: string, to: string) {
  const [totalVat, setTotalVat] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = requireSupabase();
    void supabase
      .from('expenses')
      .select('vat_amount')
      .eq('vat_applicable', true)
      .gte('expense_date', from)
      .lte('expense_date', to)
      .then(({ data }) => {
        setTotalVat((data ?? []).reduce((s, r) => s + (Number(r.vat_amount) || 0), 0));
        setLoading(false);
      });
  }, [from, to]);

  return { totalVat, loading };
}

export function useExpenseAllocationBreakdown(from: string, to: string) {
  const [breakdown, setBreakdown] = useState({ general: 0, dog: 0, litter: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = requireSupabase();
    void supabase
      .from('expenses')
      .select('allocation_type, amount, vat_amount, amount_gross')
      .gte('expense_date', from)
      .lte('expense_date', to)
      .then(({ data }) => {
        const rows = data ?? [];
        const sumType = (type: string) =>
          rows
            .filter((r) => r.allocation_type === type)
            .reduce((s, r) => s + expenseGross(r), 0);
        const general = sumType('general');
        const dog = sumType('dog');
        const litter = sumType('litter');
        setBreakdown({ general, dog, litter, total: general + dog + litter });
        setLoading(false);
      });
  }, [from, to]);

  return { breakdown, loading };
}
