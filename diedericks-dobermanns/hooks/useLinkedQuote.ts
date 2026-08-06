import { useCallback, useEffect, useState } from 'react';

import { fetchQuoteByApplicationId } from '@/lib/finance/quoteQueries';

export type LinkedQuote = { id: string; quote_number: string | null };

/**
 * Tracks the draft quote auto-generated from an application (see
 * `lib/finance/autoQuoteFromApplication.ts`). Fetches once on mount so an
 * already-approved application shows its quote link immediately, and exposes
 * `pollAfterApproval` for the moment right after approving — `reviewApplication()`
 * kicks off quote creation in the background without awaiting it, so it may
 * land a moment after the approval call itself resolves.
 */
export function useLinkedQuote(applicationId: string | undefined) {
  const [linkedQuote, setLinkedQuote] = useState<LinkedQuote | null>(null);
  const [quotePending, setQuotePending] = useState(false);
  const [quoteFailed, setQuoteFailed] = useState(false);

  useEffect(() => {
    if (!applicationId) return;
    fetchQuoteByApplicationId(applicationId)
      .then(setLinkedQuote)
      .catch(() => {});
  }, [applicationId]);

  const pollAfterApproval = useCallback(async (id: string, attempts = 6) => {
    setQuotePending(true);
    setQuoteFailed(false);
    for (let i = 0; i < attempts; i++) {
      await new Promise((r) => setTimeout(r, 500));
      try {
        const quote = await fetchQuoteByApplicationId(id);
        if (quote) {
          setLinkedQuote(quote);
          setQuotePending(false);
          return;
        }
      } catch {
        // Transient read error — keep polling rather than flipping to "failed" early.
      }
    }
    setQuotePending(false);
    setQuoteFailed(true);
  }, []);

  return { linkedQuote, quotePending, quoteFailed, pollAfterApproval };
}
