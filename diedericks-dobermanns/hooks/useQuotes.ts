import { useCallback, useEffect, useState } from 'react';

import { fetchAllQuotes, fetchQuoteById } from '@/lib/finance/quoteQueries';
import type { Quote } from '@/types/app.types';

/** Real quotes list — mirrors hooks/useInvoices.ts's shape for the finance domain. */
export function useQuotes(statusFilter?: string) {
  const [data, setData] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchAllQuotes(statusFilter);
      setData(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load quotes');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useQuoteDetail(id: string) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const row = await fetchQuoteById(id);
      setQuote(row);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load quote');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { quote, loading, error, refresh };
}
