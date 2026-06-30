import type { SupabaseClient } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export interface ListResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/** Shape every Supabase list query resolves to. */
export type ListResponse = PromiseLike<{
  data: unknown;
  error: { message: string } | null;
}>;

/**
 * Generic list hook with a demo-mode fallback. The `fetcher` builds a fully
 * type-checked Supabase query against the real schema; when no backend is
 * configured the supplied mock data is returned instead.
 */
export function useRemoteList<T>(
  mock: T[],
  fetcher: (client: SupabaseClient<Database>) => ListResponse,
): ListResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!supabase) {
      setData(mock);
      setLoading(false);
      return;
    }
    const { data: rows, error: err } = await fetcher(supabase);
    if (err) setError(err.message);
    else setData((rows ?? []) as T[]);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, refetch: load };
}
