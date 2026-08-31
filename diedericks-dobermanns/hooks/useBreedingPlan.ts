import { useCallback, useEffect, useState } from 'react';

import { fetchBreedingPlan } from '@/lib/breeding/planQueries';
import type { PlanWithSteps } from '@/lib/breeding/planTypes';

export function useBreedingPlan(id: string | undefined) {
  const [plan, setPlan] = useState<PlanWithSteps | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) {
      setPlan(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setPlan(await fetchBreedingPlan(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load this plan');
      setPlan(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { plan, loading, error, refresh };
}
