import { useCallback, useEffect, useState } from 'react';

import {
  fetchPendingClientDocuments,
  reviewClientDocument,
  type PendingClientDocument,
} from '@/lib/documents/pendingReview';

export function usePendingClientDocuments() {
  const [items, setItems] = useState<PendingClientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchPendingClientDocuments());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load pending client documents.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const review = useCallback(
    async (id: string, decision: 'verified' | 'rejected', note?: string) => {
      const result = await reviewClientDocument(id, decision, note);
      if (result.error) return result;
      await refresh();
      return result;
    },
    [refresh],
  );

  return { items, loading, error, refresh, review };
}
