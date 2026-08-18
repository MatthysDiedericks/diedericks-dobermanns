import { useCallback, useEffect, useState } from 'react';

import { buildCashflowModel, type CashflowModel } from '@/lib/finance/cashflow/build';
import { fetchCashflowInputs } from '@/lib/finance/cashflow/fetch';

export function useCashflowSummary(horizonMonths = 6) {
  const [model, setModel] = useState<CashflowModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const inputs = await fetchCashflowInputs();
      setModel(buildCashflowModel({ ...inputs, horizonMonths }));
    } catch (err) {
      setModel(null);
      setError(err instanceof Error ? err.message : 'Cashflow failed to load');
    } finally {
      setLoading(false);
    }
  }, [horizonMonths]);

  useEffect(() => {
    void load();
  }, [load]);

  return { model, loading, error, refresh: load };
}
