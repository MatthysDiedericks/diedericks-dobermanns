import { useCallback, useEffect, useRef, useState } from 'react';

import {
  findUnsentDraft,
  loadQuoteDraft,
  type UnsentDraftOffer,
} from '@/lib/finance/quoteDraftQueries';
import type { BuyerKind } from '@/lib/finance/quoteBuyerOptions';
import type { Quote } from '@/types/app.types';

export function useAppQuoteDraftOffer(input: {
  editingExisting: boolean;
  kind: BuyerKind;
  buyerId: string;
  applicationId: string | null;
  quoteId: string | null;
}) {
  const [offer, setOffer] = useState<UnsentDraftOffer | null>(null);
  const supersededId = useRef<string | null>(null);
  const ignoredId = useRef<string | null>(null);

  useEffect(() => {
    if (input.editingExisting || input.kind === 'walkin' || !input.buyerId) {
      setOffer(null);
      return;
    }
    void findUnsentDraft({
      clientId: input.kind === 'user' ? input.buyerId : null,
      contactId: input.kind === 'contact' ? input.buyerId : null,
      applicationId: input.kind === 'applicant' ? input.buyerId : input.applicationId,
      excludeId: input.quoteId ?? ignoredId.current,
    }).then((found) => {
      if (!found || found.id === input.quoteId || found.id === ignoredId.current) {
        setOffer(null);
        return;
      }
      setOffer(found);
    });
  }, [input.editingExisting, input.kind, input.buyerId, input.applicationId, input.quoteId]);

  const startFresh = useCallback(() => {
    if (!offer) return;
    ignoredId.current = offer.id;
    supersededId.current = offer.id;
    setOffer(null);
  }, [offer]);

  const resume = useCallback(async (): Promise<Quote | null> => {
    if (!offer) return null;
    const loaded = await loadQuoteDraft(offer.id);
    ignoredId.current = offer.id;
    supersededId.current = null;
    setOffer(null);
    return loaded;
  }, [offer]);

  return { offer, resume, startFresh, supersededId };
}
