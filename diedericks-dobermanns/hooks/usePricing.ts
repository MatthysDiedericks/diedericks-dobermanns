import { useCallback, useEffect, useState } from 'react';

import { fetchPricingTiers, updatePricingTier, type PricingTier } from '@/lib/finance/pricingQueries';
import type { TablesUpdate } from '@/types/database.types';

type PricingTierPatch = Pick<
  TablesUpdate<'pricing_tiers'>,
  'price' | 'display_label' | 'description' | 'is_public'
>;

/**
 * Admin-managed price list — mirrors the shape of the other finance hooks
 * (see `hooks/useQuotes.ts`): loading + error + empty states, plus a `save`
 * mutation that refreshes the list on success so "Last updated" stays honest.
 */
export function usePricing() {
  const [tiers, setTiers] = useState<PricingTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchPricingTiers();
      setTiers(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load pricing tiers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(
    async (id: string, patch: PricingTierPatch): Promise<{ error: string | null }> => {
      try {
        await updatePricingTier(id, patch);
        await refresh();
        return { error: null };
      } catch (e) {
        return { error: e instanceof Error ? e.message : 'Could not save. Please try again.' };
      }
    },
    [refresh],
  );

  return { tiers, loading, error, refresh, save };
}
