import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import { AppState } from 'react-native';

import type { QuoteSaveState } from '@/components/finance/QuoteSaveIndicator';
import { cancelDraftIfStillDraft } from '@/lib/finance/quoteDraftQueries';
import { quoteDraftHasContent, saveAppQuote } from '@/lib/finance/saveAppQuote';
import type { DeliveryDecision } from '@/lib/finance/catalogue';
import type { DraftLineItem } from '@/components/finance/LineItemRow';
import type { Quote } from '@/types/app.types';

export type AppQuoteSnapshot = {
  items: DraftLineItem[];
  buyerKind: 'applicant' | 'user' | 'contact' | 'walkin';
  buyerId: string | null;
  applicationId: string | null;
  walkinName: string;
  notes: string;
  validUntil: string;
  discountNum: number;
  deliveryDecision: DeliveryDecision | null;
  deliveryNote: string;
  changeNote: string;
  waitlistId?: string;
  total: number;
};

export function useAppQuoteDraftSave(input: {
  enabled: boolean;
  quoteId: string | null;
  setQuoteId: (id: string) => void;
  initial?: Quote | null;
  snapshot: AppQuoteSnapshot;
  supersededDraftId: MutableRefObject<string | null>;
  onError: (message: string | null) => void;
}) {
  const [saveState, setSaveState] = useState<QuoteSaveState>('idle');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapshotRef = useRef(input.snapshot);
  snapshotRef.current = input.snapshot;
  const quoteIdRef = useRef(input.quoteId);
  quoteIdRef.current = input.quoteId;
  const setQuoteIdRef = useRef(input.setQuoteId);
  setQuoteIdRef.current = input.setQuoteId;
  const onErrorRef = useRef(input.onError);
  onErrorRef.current = input.onError;
  const initialRef = useRef(input.initial);
  initialRef.current = input.initial;
  const supersededRef = input.supersededDraftId;

  const persistNow = useCallback(async (reason: 'debounce' | 'background' | 'retry' = 'debounce') => {
    const snap = snapshotRef.current;
    if (!snap.buyerKind || (!snap.buyerId && snap.buyerKind !== 'walkin')) return;
    if (snap.buyerKind === 'walkin' && !snap.walkinName.trim()) return;
    if (!quoteDraftHasContent(snap.items)) return;
    setSaveState('saving');
    try {
      const hadId = quoteIdRef.current;
      const res = await saveAppQuote({
        ...snap,
        walkinContact: '',
        initial: initialRef.current,
        quoteId: hadId,
        mode: 'draft',
      });
      quoteIdRef.current = res.quoteId;
      setQuoteIdRef.current(res.quoteId);
      if (!hadId && supersededRef.current && supersededRef.current !== res.quoteId) {
        await cancelDraftIfStillDraft(supersededRef.current);
        supersededRef.current = null;
      }
      setSaveState('saved');
      onErrorRef.current(null);
    } catch (e) {
      setSaveState('retrying');
      onErrorRef.current(e instanceof Error ? e.message : 'Could not save this quote.');
    }
    void reason;
  }, [supersededRef]);

  const cancelPending = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  useEffect(() => {
    if (!input.enabled) return;
    cancelPending();
    timer.current = setTimeout(() => {
      void persistNow('debounce');
    }, 2000);
    return cancelPending;
  }, [
    input.enabled,
    input.snapshot.items,
    input.snapshot.buyerId,
    input.snapshot.walkinName,
    input.snapshot.notes,
    input.snapshot.validUntil,
    input.snapshot.discountNum,
    input.snapshot.deliveryDecision,
    input.snapshot.deliveryNote,
    persistNow,
    cancelPending,
  ]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'background' || next === 'inactive') {
        cancelPending();
        void persistNow('background');
      }
    });
    return () => sub.remove();
  }, [cancelPending, persistNow]);

  return { saveState, persistNow, cancelPending };
}
