import { useEffect, useState } from 'react';

import { fetchLineageStrip, type LineageStripData } from '@/lib/dogs/lineageStrip';

export function useLineageStrip(dogId: string) {
  const [data, setData] = useState<LineageStripData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchLineageStrip(dogId)
      .then((next) => {
        if (!cancelled) setData(next);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load lineage');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dogId]);

  return { data, loading, error };
}
