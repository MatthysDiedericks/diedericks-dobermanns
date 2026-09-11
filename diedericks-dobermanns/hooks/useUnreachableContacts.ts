import { useCallback, useEffect, useState } from 'react';

import { countUnreachableContacts, fetchUnreachableContacts, type UnreachableContact } from '@/lib/contacts/unreachable';

export function useUnreachableContacts() {
  const [data, setData] = useState<UnreachableContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await fetchUnreachableContacts());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load unreachable contacts');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useUnreachableCount() {
  const [count, setCount] = useState(0);
  const refresh = useCallback(async () => {
    try {
      setCount(await countUnreachableContacts());
    } catch {
      setCount(0);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { count, refresh };
}
