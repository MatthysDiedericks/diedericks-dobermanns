import { useCallback, useEffect, useState } from 'react';

import {
  deriveBuyerJourneyStep,
  type BuyerJourneyStep,
} from '@/lib/portal/buyerJourney';
import { requireSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

type ProofRow = { id: string; review_status: string | null };

/**
 * Loads real application / quote / proof / dog rows and derives the buyer
 * journey step. Never throws — falls back to step 1.
 */
export function useBuyerJourney() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const [currentStep, setCurrentStep] = useState<BuyerJourneyStep>(1);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setCurrentStep(1);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const supabase = requireSupabase();
      const [appsRes, quotesRes, dogsRes] = await Promise.all([
        supabase
          .from('applications')
          .select('id, status')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(1),
        supabase
          .from('quotes')
          .select('id, status')
          .neq('status', 'draft')
          .order('created_at', { ascending: false }),
        supabase.from('dogs').select('id').eq('owner_id', userId).limit(1),
      ]);

      // review_status from migration 0053 — cast until database.types catches up.
      const { data: proofData } = await supabase
        .from('documents')
        .select('id, review_status' as 'id')
        .eq('category', 'proof_of_payment')
        .eq('uploaded_by', userId);

      const application = appsRes.data?.[0] ?? null;
      const quotes = quotesRes.data ?? [];
      const dogs = dogsRes.data ?? [];
      const proofs = (proofData ?? []) as unknown as ProofRow[];

      const sentOrBeyond = quotes.filter((q) =>
        ['sent', 'accepted', 'converted', 'paid'].includes(q.status),
      );
      const accepted = quotes.filter((q) => q.status === 'accepted');
      const anyProof = proofs.length > 0;
      const paymentConfirmed =
        proofs.some((p) => p.review_status === 'cleared') ||
        quotes.some((q) => q.status === 'paid' || q.status === 'converted');

      setCurrentStep(
        deriveBuyerJourneyStep({
          hasApplication: Boolean(application),
          applicationStatus: application?.status ?? null,
          hasQuoteSent: sentOrBeyond.length > 0,
          hasQuoteAccepted: accepted.length > 0 || paymentConfirmed,
          hasProofUploaded: anyProof,
          paymentConfirmed,
          dogAllocated: dogs.length > 0,
        }),
      );
    } catch (e) {
      console.error('[useBuyerJourney]', e);
      setCurrentStep(1);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { currentStep, loading, refresh };
}
