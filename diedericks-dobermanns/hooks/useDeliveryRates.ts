import { useCallback, useEffect, useState } from 'react';

import {
  createDeliveryRate,
  deleteDeliveryRate,
  fetchDeliveryRates,
  updateDeliveryRate,
  type DeliveryRate,
} from '@/lib/finance/deliveryRates';

export function useDeliveryRates(opts?: { activeOnly?: boolean }) {
  const [rates, setRates] = useState<DeliveryRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRates(await fetchDeliveryRates(opts));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load delivery rates');
    } finally {
      setLoading(false);
    }
  }, [opts?.activeOnly]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(
    async (
      id: string,
      patch: {
        label: string;
        amount: number;
        notes: string | null;
        active: boolean;
        sort_order: number;
      },
    ): Promise<{ error: string | null }> => {
      try {
        await updateDeliveryRate(id, patch);
        await refresh();
        return { error: null };
      } catch (e) {
        return { error: e instanceof Error ? e.message : 'Could not save.' };
      }
    },
    [refresh],
  );

  const add = useCallback(
    async (input: {
      label: string;
      amount: number;
      notes?: string | null;
    }): Promise<{ error: string | null }> => {
      try {
        await createDeliveryRate(input);
        await refresh();
        return { error: null };
      } catch (e) {
        return { error: e instanceof Error ? e.message : 'Could not add rate.' };
      }
    },
    [refresh],
  );

  const remove = useCallback(
    async (id: string): Promise<{ error: string | null }> => {
      try {
        await deleteDeliveryRate(id);
        await refresh();
        return { error: null };
      } catch (e) {
        return { error: e instanceof Error ? e.message : 'Could not remove rate.' };
      }
    },
    [refresh],
  );

  return { rates, loading, error, refresh, save, add, remove };
}
