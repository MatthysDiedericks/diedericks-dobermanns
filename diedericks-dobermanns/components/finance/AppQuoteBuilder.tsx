import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, View, type TextInput } from 'react-native';
import { useRouter } from 'expo-router';

import { AppQuoteSaveFooter } from '@/components/finance/AppQuoteSaveFooter';
import { CatalogueItemPicker } from '@/components/finance/CatalogueItemPicker';
import { DeliveryDecisionCard } from '@/components/finance/DeliveryDecisionCard';
import { LineItemList } from '@/components/finance/LineItemList';
import { type DraftLineItem } from '@/components/finance/LineItemRow';
import { QuoteBuyerPicker } from '@/components/finance/QuoteBuyerPicker';
import { QuoteDraftOfferBanner } from '@/components/finance/QuoteDraftOfferBanner';
import { PageHeader } from '@/components/layout/PageHeader';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useQuoteBuilderData } from '@/hooks/useQuoteBuilderData';
import type { CatalogueItem, DeliveryDecision } from '@/lib/finance/catalogue';
import { fetchActiveCatalogueItems } from '@/lib/finance/catalogueQueries';
import {
  blankOtherLine,
  formFromQuote,
  initialBuyerKey,
  nextQuoteLineKey,
  seedAppQuoteItems,
  type QuotePrefill,
} from '@/lib/finance/appQuoteBuilderSeed';
import { assertQuoteEditable } from '@/lib/finance/quoteEditGuards';
import { parseBuyerKey } from '@/lib/finance/quoteBuyerOptions';
import { lineFromCatalogue, syncDeliveryLine } from '@/lib/finance/quoteDelivery';
import { commitAppQuote } from '@/lib/finance/commitAppQuote';
import { useAppQuoteDeliveryAuto } from '@/lib/finance/useAppQuoteDeliveryAuto';
import { useAppQuoteDraftOffer } from '@/lib/finance/useAppQuoteDraftOffer';
import { useAppQuoteDraftSave } from '@/lib/finance/useAppQuoteDraftSave';
import { collectQuoteOutstanding, type QuoteOutstandingItem } from '@/lib/finance/quoteOutstanding';
import { subjectStatement } from '@/lib/finance/quoteSubject';
import type { Quote } from '@/types/app.types';

export type { QuotePrefill };

export function AppQuoteBuilder({
  initial,
  prefill,
}: {
  initial?: Quote | null;
  prefill?: QuotePrefill;
}) {
  const router = useRouter();
  const applicationId = prefill?.applicationId ?? initial?.application_id ?? null;
  const { buyers, dogs, litters, tiers } = useQuoteBuilderData(applicationId);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [quoteId, setQuoteId] = useState<string | null>(initial?.id ?? null);
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedBuyer, setSelectedBuyer] = useState(() => initialBuyerKey(initial, prefill));
  const [walkinName, setWalkinName] = useState(prefill?.walkinName ?? initial?.historical_client_name ?? '');
  const [items, setItems] = useState<DraftLineItem[]>(() => {
    const seeded = seedAppQuoteItems(initial, prefill?.application);
    const decision = initial?.delivery_decision ?? null;
    if (decision === 'collection' || decision === 'not_applicable') {
      return syncDeliveryLine(seeded, decision, [], nextQuoteLineKey);
    }
    return seeded;
  });
  const [discount, setDiscount] = useState(initial ? String(initial.discount) : '');
  const [notes, setNotes] = useState(initial?.notes ?? prefill?.application?.notes ?? '');
  const [changeNote, setChangeNote] = useState('');
  const [validUntil, setValidUntil] = useState(initial?.valid_until ?? '');
  const [deliveryDecision, setDeliveryDecision] = useState<DeliveryDecision | null>(
    initial?.delivery_decision ?? null,
  );
  const [deliveryNote, setDeliveryNote] = useState(initial?.delivery_note ?? '');
  const [deliveryReason, setDeliveryReason] = useState<string | null>(null);
  const [exportPrompt, setExportPrompt] = useState<string | null>(null);
  const descRefs = useRef<Record<string, TextInput | null>>({});
  const priceRefs = useRef<Record<string, TextInput | null>>({});
  const parsed = parseBuyerKey(selectedBuyer);
  const isSentEdit = Boolean(initial?.status && initial.status !== 'draft');
  const { offer: draftOffer, resume, startFresh, supersededId } = useAppQuoteDraftOffer({
    editingExisting: Boolean(initial),
    kind: parsed.kind,
    buyerId: parsed.id,
    applicationId,
    quoteId,
  });

  useAppQuoteDeliveryAuto(
    items,
    dogs,
    catalogue,
    Boolean(initial?.delivery_decision),
    setDeliveryDecision,
    setDeliveryReason,
    setExportPrompt,
    setItems,
  );

  const editGate = initial
    ? assertQuoteEditable({ status: initial.status, converted_invoice_id: initial.converted_invoice_id })
    : { ok: true as const, nextStatus: 'draft' as const };

  useEffect(() => {
    void fetchActiveCatalogueItems().then(setCatalogue).catch(() => setCatalogue([]));
  }, []);

  const subtotal = items.reduce((s, it) => s + it.quantity * it.unit_price, 0);
  const discountNum = Number(discount) || 0;
  const total = Math.max(subtotal - discountNum, 0);
  const { saveState, persistNow, cancelPending } = useAppQuoteDraftSave({
    enabled: !submitting && !isSentEdit && !draftOffer,
    quoteId,
    setQuoteId,
    initial,
    snapshot: {
      items,
      buyerKind: parsed.kind,
      buyerId: parsed.id || null,
      applicationId: parsed.kind === 'applicant' ? parsed.id : applicationId,
      walkinName,
      notes,
      validUntil,
      discountNum,
      deliveryDecision,
      deliveryNote,
      changeNote,
      waitlistId: prefill?.waitlistId,
      total,
    },
    supersededDraftId: supersededId,
    onError: setFormError,
  });
  const outstanding = collectQuoteOutstanding(items, deliveryDecision);
  const statements = items
    .filter((it) => it.item_type === 'dog')
    .map((it) => {
      const kind = it.subject_kind ?? (it.dog_id ? 'dog' : it.litter_id ? 'litter' : 'unallocated');
      return subjectStatement({
        kind,
        puppy: it.dog_id ? dogs.find((d) => d.id === it.dog_id) ?? null : null,
        litter: it.litter_id ? litters.find((l) => l.id === it.litter_id) ?? null : null,
        tierLabel: it.programme_tier ? tiers.find((t) => t.tier_key === it.programme_tier)?.display_label : null,
      });
    })
    .filter((s): s is string => Boolean(s));

  function focusOutstanding(item: QuoteOutstandingItem) {
    if (item.target === 'description' && item.lineKey) descRefs.current[item.lineKey]?.focus();
    else if (item.target === 'price' && item.lineKey) priceRefs.current[item.lineKey]?.focus();
  }

  async function onSave() {
    if (initial && !editGate.ok) {
      Alert.alert('Cannot edit', editGate.error);
      return;
    }
    if (initial?.status === 'sent' && !changeNote.trim()) {
      Alert.alert('What changed?', 'Note the change for the audit trail.');
      return;
    }
    cancelPending();
    setSubmitting(true);
    setFormError(null);
    try {
      const res = await commitAppQuote({
        initial,
        quoteId,
        items,
        selectedBuyer,
        buyerKind: parsed.kind,
        buyerId: parsed.id || null,
        applicationId: parsed.kind === 'applicant' ? parsed.id : applicationId,
        walkinName,
        notes,
        validUntil,
        discountNum,
        deliveryDecision,
        deliveryNote,
        changeNote,
        waitlistId: prefill?.waitlistId,
        total,
      });
      setQuoteId(res.quoteId);
      if (res.toWaitlist) {
        router.replace({ pathname: '/(admin)/waitlist/[id]', params: { id: res.toWaitlist } });
        return;
      }
      router.replace({ pathname: '/(admin)/quotes/[id]', params: { id: res.quoteId } });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Please try again.';
      setFormError(message);
      Alert.alert('Could not save quote', message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenContainer keyboardShouldPersistTaps="handled">
        <PageHeader eyebrow="Sales" title={initial ? 'Edit Quote' : 'New Quote'} />
        <View className="gap-4 px-6 pb-8">
          {draftOffer ? (
            <QuoteDraftOfferBanner
              offer={draftOffer}
              onResume={() => {
                void resume().then((loaded) => {
                  if (!loaded) return;
                  const next = formFromQuote(loaded);
                  setQuoteId(next.quoteId);
                  setItems(next.items);
                  setDiscount(next.discount);
                  setNotes(next.notes);
                  setValidUntil(next.validUntil);
                  setDeliveryDecision(next.deliveryDecision);
                  setDeliveryNote(next.deliveryNote);
                  setWalkinName(next.walkinName);
                });
              }}
              onStartFresh={startFresh}
            />
          ) : null}
          {prefill?.application?.priceSourceLabel ? (
            <Typography variant="caption" className="text-gold">{prefill.application.priceSourceLabel}</Typography>
          ) : null}
          <QuoteBuyerPicker
            options={buyers}
            selectedKey={selectedBuyer}
            onSelect={setSelectedBuyer}
            walkinName={walkinName}
            onWalkinChange={setWalkinName}
          />
          <LineItemList
            items={items}
            puppies={dogs}
            litters={litters}
            tiers={tiers}
            applicationTier={prefill?.application?.applicationTier ?? null}
            onUpdate={(key, patch) => setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)))}
            onRemove={(key) => setItems((prev) => prev.filter((it) => it.key !== key))}
            onAdd={() => setItems((prev) => [...prev, blankOtherLine()])}
            onAddCatalogue={() => setPickerOpen(true)}
            bindDescription={(key, el) => {
              descRefs.current[key] = el;
            }}
            bindPrice={(key, el) => {
              priceRefs.current[key] = el;
            }}
          />
          <DeliveryDecisionCard
            decision={deliveryDecision}
            note={deliveryNote}
            reason={deliveryReason}
            exportPrompt={exportPrompt}
            onDecisionChange={(d) => {
              setDeliveryDecision(d);
              setItems((prev) => syncDeliveryLine(prev, d, catalogue, nextQuoteLineKey));
            }}
            onNoteChange={setDeliveryNote}
            onDismissExportPrompt={() => setExportPrompt(null)}
          />
          <Input label="Discount (ZAR)" keyboardType="phone-pad" value={discount} onChangeText={setDiscount} />
          <Input label="Valid until (YYYY-MM-DD)" value={validUntil} onChangeText={setValidUntil} />
          <Input label="Notes" value={notes} onChangeText={setNotes} multiline className="h-24" />
          {initial ? (
            <Input
              label={initial.status === 'sent' ? 'What changed (required)' : 'Edit note (optional)'}
              value={changeNote}
              onChangeText={setChangeNote}
              multiline
              className="h-20"
            />
          ) : null}
          <AppQuoteSaveFooter
            outstanding={outstanding}
            onSelectOutstanding={focusOutstanding}
            formError={formError}
            saveState={saveState}
            onRetry={() => void persistNow('retry')}
            total={total}
            statements={statements}
            canSave={editGate.ok}
            submitting={submitting}
            onSave={() => void onSave()}
          />
        </View>
      </ScreenContainer>
      <CatalogueItemPicker
        visible={pickerOpen}
        items={catalogue}
        onPick={(item) => setItems((prev) => [...prev, lineFromCatalogue(item, nextQuoteLineKey)])}
        onClose={() => setPickerOpen(false)}
      />
    </KeyboardAvoidingView>
  );
}
