import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, View, type TextInput } from 'react-native';
import { useRouter } from 'expo-router';

import { CatalogueItemPicker } from '@/components/finance/CatalogueItemPicker';
import { DeliveryDecisionCard } from '@/components/finance/DeliveryDecisionCard';
import { LineItemList } from '@/components/finance/LineItemList';
import { type DraftLineItem } from '@/components/finance/LineItemRow';
import { QuoteBuyerPicker } from '@/components/finance/QuoteBuyerPicker';
import { QuoteSendChecklist } from '@/components/finance/QuoteSendChecklist';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useQuoteBuilderData } from '@/hooks/useQuoteBuilderData';
import type { CatalogueItem, DeliveryDecision } from '@/lib/finance/catalogue';
import { fetchActiveCatalogueItems } from '@/lib/finance/catalogueQueries';
import {
  initialBuyerKey,
  nextQuoteLineKey,
  seedAppQuoteItems,
  type QuotePrefill,
} from '@/lib/finance/appQuoteBuilderSeed';
import { assertQuoteEditable } from '@/lib/finance/quoteEditGuards';
import { parseBuyerKey } from '@/lib/finance/quoteBuyerOptions';
import {
  EXPORT_PROMPT,
  computeDeliveryDefaults,
  lineFromCatalogue,
  syncDeliveryLine,
} from '@/lib/finance/quoteDelivery';
import { saveAppQuote } from '@/lib/finance/saveAppQuote';
import { formatPrice } from '@/lib/format';
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
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedBuyer, setSelectedBuyer] = useState(() => initialBuyerKey(initial, prefill));
  const [walkinName, setWalkinName] = useState(prefill?.walkinName ?? initial?.historical_client_name ?? '');
  const [items, setItems] = useState<DraftLineItem[]>(() => seedAppQuoteItems(initial, prefill?.application));
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
  const autoApplied = useRef(Boolean(initial?.delivery_decision));
  const descRefs = useRef<Record<string, TextInput | null>>({});
  const priceRefs = useRef<Record<string, TextInput | null>>({});
  const parsed = parseBuyerKey(selectedBuyer);

  const editGate = initial
    ? assertQuoteEditable({ status: initial.status, converted_invoice_id: initial.converted_invoice_id })
    : { ok: true as const, nextStatus: 'draft' as const };

  useEffect(() => {
    void fetchActiveCatalogueItems().then(setCatalogue).catch(() => setCatalogue([]));
  }, []);

  const dogTier = useMemo(
    () =>
      items
        .filter((it) => it.item_type === 'dog')
        .map((it) => it.programme_tier ?? (it.dog_id ? dogs.find((d) => d.id === it.dog_id)?.programme_tier : null)),
    [items, dogs],
  );

  useEffect(() => {
    if (autoApplied.current) return;
    if (!dogTier.some(Boolean)) return;
    const def = computeDeliveryDefaults(dogTier, null);
    if (def.decision) {
      setDeliveryDecision(def.decision);
      setItems((prev) => syncDeliveryLine(prev, def.decision, catalogue, nextQuoteLineKey));
    }
    setDeliveryReason(def.reason);
    if (def.suggestExport) setExportPrompt(EXPORT_PROMPT);
    autoApplied.current = true;
  }, [dogTier, catalogue]);

  const subtotal = items.reduce((s, it) => s + it.quantity * it.unit_price, 0);
  const discountNum = Number(discount) || 0;
  const total = Math.max(subtotal - discountNum, 0);
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
    .filter(Boolean);

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
    if (!selectedBuyer) {
      Alert.alert('Select a buyer', 'Choose the applicant, a portal user, a contact, or not in the list.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await saveAppQuote({
        initial,
        items,
        buyerKind: parsed.kind,
        buyerId: parsed.id || null,
        applicationId: parsed.kind === 'applicant' ? parsed.id : applicationId,
        walkinName,
        walkinContact: '',
        notes,
        validUntil,
        discountNum,
        deliveryDecision,
        deliveryNote,
        changeNote,
        waitlistId: prefill?.waitlistId,
        total,
      });
      if (res.toWaitlist) {
        router.replace({ pathname: '/(admin)/waitlist/[id]', params: { id: res.toWaitlist } });
        return;
      }
      router.replace({ pathname: '/(admin)/quotes/[id]', params: { id: res.quoteId } });
    } catch (e) {
      Alert.alert('Could not save quote', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenContainer keyboardShouldPersistTaps="handled">
        <PageHeader eyebrow="Sales" title={initial ? 'Edit Quote' : 'New Quote'} />
        <View className="gap-4 px-6 pb-8">
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
            onAdd={() =>
              setItems((prev) => [
                ...prev,
                {
                  key: nextQuoteLineKey(),
                  item_type: 'other',
                  dog_id: null,
                  litter_id: null,
                  subject_kind: 'unallocated',
                  description: '',
                  quantity: 1,
                  unit_price: 0,
                },
              ])
            }
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
          <QuoteSendChecklist items={outstanding} onSelect={focusOutstanding} />
          <Card>
            <View className="flex-row justify-between">
              <Typography variant="bodyMuted">Total</Typography>
              <Typography variant="subtitle" className="text-gold">{formatPrice(total)}</Typography>
            </View>
            {statements.map((s) => (
              <Typography key={s} variant="caption" className="mt-2 text-ink-muted">{s}</Typography>
            ))}
          </Card>
          {editGate.ok ? (
            <>
              <Button label="Save & Preview" onPress={() => void onSave()} loading={submitting} fullWidth />
              {outstanding.length ? (
                <Typography variant="caption" className="text-gold">
                  You can save a draft. Send stays blocked until the items above are done.
                </Typography>
              ) : null}
            </>
          ) : null}
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
