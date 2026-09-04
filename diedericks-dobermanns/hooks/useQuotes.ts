import { useCallback, useEffect, useState } from 'react';

import { fetchAllQuotes, fetchQuoteById } from '@/lib/finance/quoteQueries';
import { useAuthStore } from '@/stores/authStore';
import type { Quote } from '@/types/app.types';

function useActorId(): string | undefined {
  return useAuthStore((s) => s.session?.user.id ?? s.profile?.id);
}

/** Real quotes list — mirrors hooks/useInvoices.ts's shape for the finance domain. */
export function useQuotes(statusFilter?: string) {
  const userId = useActorId();
  const [data, setData] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchAllQuotes(userId, statusFilter);
      setData(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load quotes');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useQuoteDetail(id: string) {
  const userId = useActorId();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id || !userId) return;
    setLoading(true);
    setError(null);
    try {
      const row = await fetchQuoteById(id, userId);
      setQuote(row);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load quote');
    } finally {
      setLoading(false);
    }
  }, [id, userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { quote, loading, error, refresh };
}
