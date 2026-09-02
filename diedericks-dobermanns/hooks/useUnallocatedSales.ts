import { useCallback, useEffect, useState } from 'react';

import { allocateDogToClient } from '@/lib/dogs/allocation';
import {
  countUnallocatedDogs,
  fetchClientUsers,
  fetchUnallocatedDogs,
  type ClientOption,
  type UnallocatedDog,
} from '@/lib/dogs/unallocatedSales';

export function useUnallocatedSales() {
  const [dogs, setDogs] = useState<UnallocatedDog[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextDogs, nextClients] = await Promise.all([
        fetchUnallocatedDogs(),
        fetchClientUsers(),
      ]);
      setDogs(nextDogs);
      setClients(nextClients);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load unallocated sales.');
      setDogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const allocate = useCallback(
    async (dogId: string, clientUserId: string) => {
      const result = await allocateDogToClient(dogId, clientUserId);
      if (result.error) return { error: result.error };
      await refresh();
      return {};
    },
    [refresh],
  );

  return { dogs, clients, loading, error, refresh, allocate };
}

export function useUnallocatedSalesCount() {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      setCount(await countUnallocatedDogs());
    } catch {
      setCount(0);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { count, refresh };
}
