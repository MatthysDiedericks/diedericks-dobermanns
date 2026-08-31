import { useCallback, useEffect, useState } from 'react';

import {
  fetchActivePlanNextSteps,
  fetchBreedingPlans,
} from '@/lib/breeding/planQueries';
import type { PlanNextRow, PlanWithSteps } from '@/lib/breeding/planTypes';

export function useBreedingPlans() {
  const [plans, setPlans] = useState<PlanWithSteps[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPlans(await fetchBreedingPlans());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load plans');
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { plans, loading, error, refresh };
}

export function useActivePlanNextSteps() {
  const [rows, setRows] = useState<PlanNextRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchActivePlanNextSteps());
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { rows, loading, refresh };
}
