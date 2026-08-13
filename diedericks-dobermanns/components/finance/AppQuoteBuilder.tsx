import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { CatalogueItemPicker } from '@/components/finance/CatalogueItemPicker';
import { ClientOrWalkinPicker } from '@/components/finance/ClientOrWalkinPicker';
import { DeliveryDecisionCard } from '@/components/finance/DeliveryDecisionCard';
import { LineItemList } from '@/components/finance/LineItemList';
import { type DraftLineItem } from '@/components/finance/LineItemRow';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useAdminDogs, useAdminLitters, useClients } from '@/hooks/useAdmin';
import { useQuotePrefillMatch } from '@/hooks/useQuotePrefillMatch';
import type { CatalogueItem, DeliveryDecision } from '@/lib/finance/catalogue';
import {
  fetchActiveCatalogueItems,
  resolveBuyerCountry,
} from '@/lib/finance/catalogueQueries';
import { assertQuoteEditable } from '@/lib/finance/quoteEditGuards';
import {
  EXPORT_PROMPT,
  computeDeliveryDefaults,
  lineFromCatalogue,
  syncDeliveryLine,
} from '@/lib/finance/quoteDelivery';
import { saveAppQuote } from '@/lib/finance/saveAppQuote';
import { formatPrice } from '@/lib/format';
import type { Quote } from '@/types/app.types';

export type QuotePrefill = {
  waitlistId?: string;
  clientId?: string;
  walkinName?: string;
  walkinContact?: string;
  dogId?: string;
  litterId?: string;
};

let keyCounter = 0;
const nextKey = () => `item-${keyCounter++}`;

function seedItems(quote?: Quote | null, skipDefaultBlank?: boolean): DraftLineItem[] {
  if (!quote?.items?.length) {
    if (skipDefaultBlank) return [];
    return [{ key: nextKey(), item_type: 'dog', dog_id: null, description: '', quantity: 1, unit_price: 0 }];
  }
  return quote.items.map((it) => ({
    key: nextKey(),
    item_type: it.item_type,
    dog_id: it.dog_id,
    description: it.description,
    quantity: it.quantity,
    unit_price: it.unit_price,
    catalogue_code: it.catalogue_code ?? null,
    allowZeroPrice: it.item_type === 'delivery' && it.unit_price === 0,
  }));
}

export function AppQuoteBuilder({
  initial,
  prefill,
}: {
  initial?: Quote | null;
  prefill?: QuotePrefill;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [catalogue, setCatalogue] = useState<CatalogueItem[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const { data: clients } = useClients();
  const { data: dogs } = useAdminDogs();
  const { data: litters } = useAdminLitters();

  const [mode, setMode] = useState<'client' | 'walkin'>(
    prefill?.clientId ? 'client' : prefill?.walkinName || initial?.historical_client_name ? 'walkin' : 'client',
  );
  const [clientId, setClientId] = useState<string | null>(prefill?.clientId ?? initial?.client_id ?? null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [walkinName, setWalkinName] = useState(prefill?.walkinName ?? initial?.historical_client_name ?? '');
  const [walkinContact, setWalkinContact] = useState(prefill?.walkinContact ?? '');
  const [items, setItems] = useState<DraftLineItem[]>(() =>
    seedItems(initial, Boolean(prefill?.dogId || prefill?.litterId)),
  );
  const [discount, setDiscount] = useState(initial ? String(initial.discount) : '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [changeNote, setChangeNote] = useState('');
  const [validUntil, setValidUntil] = useState(initial?.valid_until ?? '');
  const [deliveryDecision, setDeliveryDecision] = useState<DeliveryDecision | null>(
    initial?.delivery_decision ?? null,
  );
  const [deliveryNote, setDeliveryNote] = useState(initial?.delivery_note ?? '');
  const [deliveryReason, setDeliveryReason] = useState<string | null>(null);
  const [exportPrompt, setExportPrompt] = useState<string | null>(null);
  const [buyerCountry, setBuyerCountry] = useState<string | null>(null);
  const autoApplied = useRef(Boolean(initial?.delivery_decision));

  const editGate = initial
    ? assertQuoteEditable({
        status: initial.status,
        converted_invoice_id: initial.converted_invoice_id,
      })
    : { ok: true as const, nextStatus: 'draft' as const };

  useQuotePrefillMatch(prefill, Boolean(initial), dogs, litters, addDog, setItems, nextKey);
  useEffect(() => {
    void fetchActiveCatalogueItems().then(setCatalogue).catch(() => setCatalogue([]));
  }, []);
  useEffect(() => {
    void resolveBuyerCountry({
      clientId,
      applicationId: initial?.application_id ?? null,
    }).then(setBuyerCountry);
  }, [clientId, initial?.application_id]);
  const dogTier = useMemo(() => {
    const map = new Map((dogs ?? []).map((d) => [d.id, d.programme_tier as string | null]));
    return items.filter((it) => it.dog_id).map((it) => map.get(it.dog_id!) ?? null);
  }, [items, dogs]);

  useEffect(() => {
    if (autoApplied.current) return;
    if (!dogTier.some(Boolean) && !buyerCountry) return;
    const def = computeDeliveryDefaults(dogTier, buyerCountry);
    if (def.decision) {
      setDeliveryDecision(def.decision);
      setItems((prev) => syncDeliveryLine(prev, def.decision, catalogue, nextKey));
    }
    setDeliveryReason(def.reason);
    if (def.suggestExport) setExportPrompt(EXPORT_PROMPT);
    autoApplied.current = true;
  }, [dogTier, buyerCountry, catalogue]);

  const subtotal = useMemo(
    () => items.reduce((s, it) => s + it.quantity * it.unit_price, 0),
    [items],
  );
  const discountNum = Number(discount) || 0;
  const total = Math.max(subtotal - discountNum, 0);

  function updateItem(key: string, patch: Partial<DraftLineItem>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }
  function removeItem(key: string) {
    setItems((prev) => prev.filter((it) => it.key !== key));
  }
  function addBlank() {
    setItems((prev) => [
      ...prev,
      { key: nextKey(), item_type: 'other', dog_id: null, description: '', quantity: 1, unit_price: 0 },
    ]);
  }
  function addDog(dogId: string, name: string, price: number | null) {
    setItems((prev) => [
      ...prev,
      { key: nextKey(), item_type: 'dog', dog_id: dogId, description: name, quantity: 1, unit_price: price ?? 0 },
    ]);
    autoApplied.current = false;
  }

  async function onSave() {
    if (initial && !editGate.ok) { Alert.alert('Cannot edit', editGate.error); return; }
    if (initial?.status === 'sent' && !changeNote.trim()) {
      Alert.alert('What changed?', 'Note the change for the audit trail.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await saveAppQuote({
        initial,
        items,
        mode,
        clientId,
        walkinName,
        walkinContact,
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
          {initial && !editGate.ok ? (
            <Card>
              <Typography variant="bodyMuted">{editGate.error}</Typography>
            </Card>
          ) : null}
          <ClientOrWalkinPicker
            mode={mode}
            clientId={clientId}
            walkinName={walkinName}
            walkinContact={walkinContact}
            clients={clients}
            showQuickAdd={showQuickAdd}
            onSelectClient={(id) => {
              setClientId(clientId === id ? null : id);
              setMode('client');
              autoApplied.current = false;
            }}
            onOpenQuickAdd={() => setShowQuickAdd(true)}
            onToggleQuickAdd={() => setShowQuickAdd((v) => !v)}
            onChangeWalkinName={setWalkinName}
            onChangeWalkinContact={setWalkinContact}
            onConfirmWalkin={(name, contact) => {
              setWalkinName(name);
              setWalkinContact(contact);
              setMode('walkin');
              setClientId(null);
              setShowQuickAdd(false);
            }}
          />
          <LineItemList
            items={items}
            onUpdate={updateItem}
            onRemove={removeItem}
            onAdd={addBlank}
            onAddCatalogue={() => setPickerOpen(true)}
          />
          <DeliveryDecisionCard
            decision={deliveryDecision}
            note={deliveryNote}
            reason={deliveryReason}
            exportPrompt={exportPrompt}
            onDecisionChange={(d) => {
              setDeliveryDecision(d);
              setItems((prev) => syncDeliveryLine(prev, d, catalogue, nextKey));
            }}
            onNoteChange={setDeliveryNote}
            onDismissExportPrompt={() => setExportPrompt(null)}
          />
          {dogs?.length ? (
            <View className="flex-row flex-wrap gap-2">
              {dogs.slice(0, 12).map((d) => (
                <Pressable
                  key={d.id}
                  onPress={() => addDog(d.id, d.name, d.price)}
                  className="rounded-xl border border-gold/20 bg-surface px-3 py-2"
                >
                  <Typography variant="caption" className="text-ink-muted">
                    + {d.name}
                  </Typography>
                </Pressable>
              ))}
            </View>
          ) : null}
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
          <Card>
            <View className="flex-row justify-between">
              <Typography variant="bodyMuted">Total</Typography>
              <Typography variant="subtitle" className="text-gold">
                {formatPrice(total)}
              </Typography>
            </View>
          </Card>
          {editGate.ok ? (
            <Button label="Save & Preview" onPress={() => void onSave()} loading={submitting} fullWidth />
          ) : null}
        </View>
      </ScreenContainer>
      <CatalogueItemPicker
        visible={pickerOpen}
        items={catalogue}
        onPick={(item) => setItems((prev) => [...prev, lineFromCatalogue(item, nextKey)])}
        onClose={() => setPickerOpen(false)}
      />
    </KeyboardAvoidingView>
  );
}
