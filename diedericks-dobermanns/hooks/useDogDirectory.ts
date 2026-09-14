import { useCallback, useEffect, useState } from 'react';

import { fetchDogDirectory, type DirectoryDog } from '@/lib/dogs/directory';

export function useDogDirectory() {
  const [dogs, setDogs] = useState<DirectoryDog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDogs(await fetchDogDirectory());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dogs');
      setDogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { dogs, loading, error, refresh };
}
