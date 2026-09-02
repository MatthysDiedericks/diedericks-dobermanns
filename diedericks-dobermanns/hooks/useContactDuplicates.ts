import { useCallback, useEffect, useState } from 'react';

import {
  countOpenDuplicates,
  fetchOpenDuplicatePairs,
  mergeDuplicateCandidate,
  resolveDuplicateNotSame,
  type OpenDuplicatePair,
} from '@/lib/contacts/duplicates';
import { useAuthStore } from '@/stores/authStore';

export function useOpenDuplicateCount() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setCount(await countOpenDuplicates());
    } catch {
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { count, loading, refresh };
}

export function useContactDuplicates() {
  const actorId = useAuthStore((s) => s.session?.user?.id);
  const [pairs, setPairs] = useState<OpenDuplicatePair[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPairs(await fetchOpenDuplicatePairs());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load duplicates');
      setPairs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const merge = useCallback(
    async (candidateId: string, survivorId: string, loserId: string) => {
      if (!actorId) throw new Error('Sign in required.');
      await mergeDuplicateCandidate(candidateId, survivorId, loserId, actorId);
      await refresh();
    },
    [actorId, refresh],
  );

  const dismiss = useCallback(
    async (candidateId: string) => {
      if (!actorId) throw new Error('Sign in required.');
      await resolveDuplicateNotSame(candidateId, actorId);
      await refresh();
    },
    [actorId, refresh],
  );

  return { pairs, loading, error, refresh, merge, dismiss };
}
