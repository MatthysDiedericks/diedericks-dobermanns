import { useCallback, useEffect, useState } from 'react';

import {
  fetchUnlabelledDocuments,
  labelDocument,
  type UnlabelledDocument,
} from '@/lib/documents/unlabelled';

export function useUnlabelledDocuments() {
  const [items, setItems] = useState<UnlabelledDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchUnlabelledDocuments());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load unlabelled documents.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveLabel = useCallback(
    async (id: string, name: string, category: string) => {
      const result = await labelDocument(id, name, category);
      if (result.error) return result;
      await refresh();
      return result;
    },
    [refresh],
  );

  return { items, loading, error, refresh, saveLabel };
}
