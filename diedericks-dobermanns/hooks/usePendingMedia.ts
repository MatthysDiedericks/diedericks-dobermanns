import { useCallback, useEffect, useState } from 'react';

import {
  countPendingMedia,
  deletePendingDogMedia,
  fetchPendingMedia,
  keepDogMediaPrivate,
  publishDogMedia,
  type PendingMediaItem,
} from '@/lib/media/pendingReview';

export function usePendingMedia() {
  const [items, setItems] = useState<PendingMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setItems(await fetchPendingMedia());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load pending media.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const publish = useCallback(
    async (id: string) => {
      const result = await publishDogMedia(id);
      if (!result.error) await refresh();
      return result;
    },
    [refresh],
  );

  const decline = useCallback(
    async (id: string) => {
      const result = await keepDogMediaPrivate(id);
      if (!result.error) await refresh();
      return result;
    },
    [refresh],
  );

  const remove = useCallback(
    async (item: PendingMediaItem) => {
      const result = await deletePendingDogMedia(item.id, item.url, item.thumbnail_url);
      if (!result.error) await refresh();
      return result;
    },
    [refresh],
  );

  return { items, loading, error, refresh, publish, decline, remove };
}

export function usePendingMediaCount() {
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      setCount(await countPendingMedia());
    } catch {
      setCount(0);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { count, refresh };
}
