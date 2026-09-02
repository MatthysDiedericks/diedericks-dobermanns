import { useCallback, useEffect, useState } from 'react';

import { fetchDogJourney } from '@/lib/training/journeyQueries';
import type { JourneyEntry } from '@/lib/training/journeyTypes';

export function useDogJourney(dogId: string) {
  const [dogName, setDogName] = useState('');
  const [entries, setEntries] = useState<JourneyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!dogId) return;
    setLoading(true);
    setError(null);
    try {
      const next = await fetchDogJourney(dogId);
      setDogName(next.dogName);
      setEntries(next.entries);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the journey.');
    } finally {
      setLoading(false);
    }
  }, [dogId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { dogName, entries, loading, error, refresh };
}
