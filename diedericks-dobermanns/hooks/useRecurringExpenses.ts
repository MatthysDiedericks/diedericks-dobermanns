import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  groupRecurringByInterval,
  intervalLabel,
  recurringSummaryTotals,
} from '@/lib/finance/recurringUtils';
import { fetchAllExpenses } from '@/lib/finance/queries';
import { showError, showSaved } from '@/lib/dogDetail/feedback';
import { requireSupabase } from '@/lib/supabase';
import type { ExpenseWithCategory } from '@/types/finance';

export function useRecurringExpenses() {
  const [expenses, setExpenses] = useState<ExpenseWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchAllExpenses();
      setExpenses(rows.filter((e) => e.is_recurring));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load recurring expenses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => groupRecurringByInterval(expenses), [expenses]);
  const totals = useMemo(() => recurringSummaryTotals(expenses), [expenses]);

  const removeRecurring = useCallback(
    async (id: string) => {
      try {
        const sb = requireSupabase();
        const { error: err } = await sb
          .from('expenses')
          .update({
            is_recurring: false,
            recurrence_interval: null,
            recurrence_end_date: null,
          })
          .eq('id', id);
        if (err) throw err;
        setExpenses((prev) => prev.filter((e) => e.id !== id));
        showSaved('Recurring schedule removed');
      } catch (e) {
        showError('Could not update expense.');
        console.error('[useRecurringExpenses.removeRecurring]', e);
      }
    },
    [],
  );

  return {
    expenses,
    grouped,
    totals,
    loading,
    error,
    refresh: load,
    removeRecurring,
    intervalLabel,
  };
}
