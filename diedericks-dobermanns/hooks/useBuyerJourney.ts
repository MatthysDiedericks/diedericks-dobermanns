import { useCallback, useEffect, useState } from 'react';

import { formatRevisionBanner } from '@/lib/finance/quoteEditGuards';
import {
  deriveBuyerJourneyStep,
  isEarnedWaitingListPlace,
  isWaitlistStepSkipped,
  type BuyerJourneyStep,
} from '@/lib/portal/buyerJourney';
import { fetchMyClientIds, fetchMyDogIds, fetchMyFinancialClientIds } from '@/lib/portal/memberScope';
import { requireSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

type ProofRow = { id: string; review_status: string | null };
type DogHandoverRow = {
  id: string;
  handover_status: string | null;
  delivered_at: string | null;
};

/**
 * Loads real application / quote / proof / dog rows and derives the buyer
 * journey step. Never throws — falls back to step 1.
 */
export function useBuyerJourney() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const [currentStep, setCurrentStep] = useState<BuyerJourneyStep>(1);
  const [applicationApproved, setApplicationApproved] = useState(false);
  const [skipWaitingList, setSkipWaitingList] = useState(false);
  const [quoteRevisionNote, setQuoteRevisionNote] = useState<string | null>(null);
  const [quoteRevision, setQuoteRevision] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setCurrentStep(1);
      setApplicationApproved(false);
      setSkipWaitingList(false);
      setQuoteRevisionNote(null);
      setQuoteRevision(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const supabase = requireSupabase();
      const [financialIds, clientIds] = await Promise.all([
        fetchMyFinancialClientIds(),
        fetchMyClientIds(),
      ]);
      const appsRes = await supabase
        .from('applications')
        .select('id, status')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);
      const appIds = (appsRes.data ?? []).map((a) => a.id);
      let quotesQuery = supabase
        .from('quotes')
        .select('id, status, revision, sent_at, last_sent_revision')
        .neq('status', 'draft')
        .order('created_at', { ascending: false });
      quotesQuery =
        appIds.length > 0
          ? quotesQuery.or(
              `${financialIds.map((id) => `client_id.eq.${id}`).join(',')},application_id.in.(${appIds.join(',')})`,
            )
          : financialIds.length === 1
            ? quotesQuery.eq('client_id', financialIds[0]!)
            : quotesQuery.in('client_id', financialIds);
      const dogIds = await fetchMyDogIds();
      const waitlistByClient =
        clientIds.length > 0
          ? supabase
              .from('waiting_list')
              .select('id, payment_status, deposit_paid_date, deposit_invoice_id')
              .in('client_id', clientIds)
          : Promise.resolve({
              data: [] as {
                id: string;
                payment_status: string | null;
                deposit_paid_date: string | null;
                deposit_invoice_id: string | null;
              }[],
            });
      const waitlistByApp =
        appIds.length > 0
          ? supabase
              .from('waiting_list')
              .select('id, payment_status, deposit_paid_date, deposit_invoice_id')
              .in('application_id', appIds)
          : Promise.resolve({
              data: [] as {
                id: string;
                payment_status: string | null;
                deposit_paid_date: string | null;
                deposit_invoice_id: string | null;
              }[],
            });
      const [quotesRes, dogsRes, waitClientRes, waitAppRes] = await Promise.all([
        quotesQuery,
        dogIds.length
          ? supabase
              .from('dogs')
              .select('id, handover_status, delivered_at')
              .in('id', dogIds)
          : Promise.resolve({ data: [] as DogHandoverRow[] }),
        waitlistByClient,
        waitlistByApp,
      ]);

      // review_status from migration 0053 — cast until database.types catches up.
      const { data: proofData } = await supabase
        .from('documents')
        .select('id, review_status' as 'id')
        .eq('category', 'proof_of_payment')
        .in('uploaded_by', financialIds);

      const application = appsRes.data?.[0] ?? null;
      const quotes = (quotesRes.data ?? []) as unknown as {
        id: string;
        status: string;
        revision?: number | null;
        sent_at?: string | null;
        last_sent_revision?: number | null;
      }[];
      const dogs = (dogsRes.data ?? []) as DogHandoverRow[];
      const proofs = (proofData ?? []) as unknown as ProofRow[];
      const onWaitingList = [...(waitClientRes.data ?? []), ...(waitAppRes.data ?? [])].some(
        isEarnedWaitingListPlace,
      );

      const sentOrBeyond = quotes.filter((q) =>
        ['sent', 'accepted', 'converted', 'paid'].includes(q.status),
      );
      const accepted = quotes.filter((q) => q.status === 'accepted');
      const anyProof = proofs.length > 0;
      const paymentConfirmed =
        proofs.some((p) => p.review_status === 'cleared') ||
        quotes.some((q) => q.status === 'paid' || q.status === 'converted');
      const approved = application?.status === 'approved';
      const goneHome = dogs.some(
        (d) => d.handover_status === 'delivered' || Boolean(d.delivered_at),
      );

      const latest = quotes[0];
      const rev = latest?.revision ?? latest?.last_sent_revision ?? 1;
      setQuoteRevision(rev > 1 ? rev : null);
      if (latest && (rev ?? 1) > 1) {
        const { data: revs } = await supabase
          .from('quote_revisions' as never)
          .select('sent_at, revision')
          .eq('quote_id' as never, latest.id)
          .order('revision' as never, { ascending: false })
          .limit(2);
        const rows = (revs ?? []) as unknown as { sent_at: string | null; revision: number }[];
        setQuoteRevisionNote(
          formatRevisionBanner(rows[0]?.sent_at ?? latest.sent_at ?? null, rows[1]?.sent_at ?? null),
        );
      } else {
        setQuoteRevisionNote(null);
      }

      const input = {
        hasApplication: Boolean(application),
        applicationStatus: application?.status ?? null,
        applicationApproved: approved,
        portalAccessed: true,
        hasQuoteSent: sentOrBeyond.length > 0,
        hasQuoteAccepted: accepted.length > 0 || paymentConfirmed,
        hasProofUploaded: anyProof,
        paymentConfirmed,
        onWaitingList,
        dogAllocated: dogs.length > 0,
        goneHome,
      };
      setCurrentStep(deriveBuyerJourneyStep(input));
      setApplicationApproved(approved);
      setSkipWaitingList(isWaitlistStepSkipped(input));
    } catch (e) {
      console.error('[useBuyerJourney]', e);
      setCurrentStep(1);
      setApplicationApproved(false);
      setSkipWaitingList(false);
      setQuoteRevisionNote(null);
      setQuoteRevision(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    currentStep,
    applicationApproved,
    skipWaitingList,
    quoteRevision,
    quoteRevisionNote,
    loading,
    refresh,
  };
}
