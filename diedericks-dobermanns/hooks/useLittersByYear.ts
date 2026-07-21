import { useCallback, useEffect, useState } from 'react';

import { fetchLittersByYear, fetchLitterYears } from '@/lib/kennel/littersByYear';
import type { CurrentLitterRow } from '@/types/kennel';

/** Years that have at least one litter — feeds the dashboard's year-chip scroller. */
export function useLitterYears() {
  const [years, setYears] = useState<number[]>([]);

  useEffect(() => {
    fetchLitterYears()
      .then(setYears)
      .catch(() => setYears([]));
  }, []);

  return years;
}

/** Litters for a single year, any status. Pass `null` to skip fetching (collapsed state). */
export function useLittersByYear(year: number | null) {
  const [litters, setLitters] = useState<CurrentLitterRow[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (year == null) {
      setLitters([]);
      return;
    }
    setLoading(true);
    try {
      setLitters(await fetchLittersByYear(year));
    } catch {
      setLitters([]);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { litters, loading };
}
