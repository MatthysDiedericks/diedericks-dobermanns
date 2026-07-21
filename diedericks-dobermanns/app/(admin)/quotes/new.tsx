import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { ClientOrWalkinPicker } from '@/components/finance/ClientOrWalkinPicker';
import { LineItemList } from '@/components/finance/LineItemList';
import { type DraftLineItem } from '@/components/finance/LineItemRow';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useAdminDogs, useAdminLitters, useClients } from '@/hooks/useAdmin';
import { useQuoteDetail } from '@/hooks/useQuotes';
import { useQuotePrefillMatch } from '@/hooks/useQuotePrefillMatch';
import { formatPrice } from '@/lib/format';
import type { LineItemInput } from '@/lib/finance/mutations';
import { createQuote, updateQuote } from '@/lib/finance/quoteQueries';
import { updateWaitlistEntry } from '@/lib/waitlist/mutations';
import type { Quote } from '@/types/app.types';

interface QuotePrefill {
  waitlistId?: string;
  clientId?: string;
  walkinName?: string;
  walkinContact?: string;
  dogId?: string;
  litterId?: string;
}

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
  }));
}

function QuoteBuilder({ initial, prefill }: { initial?: Quote | null; prefill?: QuotePrefill }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const { data: clients } = useClients();
  const { data: dogs } = useAdminDogs();
  const { data: litters } = useAdminLitters();

  // Only one of client_id / historical_client_name is ever set on a quote —
  // `mode` tracks which one this builder is currently editing.
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
  const [validUntil, setValidUntil] = useState(initial?.valid_until ?? '');

  useQuotePrefillMatch(prefill, Boolean(initial), dogs, litters, addDog, setItems, nextKey);

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
  }

  function confirmWalkin(name: string, contact: string) {
    setWalkinName(name);
    setWalkinContact(contact);
    setMode('walkin');
    setClientId(null);
    setShowQuickAdd(false);
  }

  function selectClient(id: string) {
    setClientId(clientId === id ? null : id);
    setMode('client');
  }

  async function onSave(status: 'draft' | 'sent') {
    const cleanItems: LineItemInput[] = items
      .filter((it) => it.description.trim())
      .map((it) => ({
        item_type: it.item_type,
        dog_id: it.dog_id ?? null,
        description: it.description,
        quantity: it.quantity,
        unit_price: it.unit_price,
      }));
    if (cleanItems.length === 0) return;
    const combinedNotes = [notes.trim(), walkinContact.trim() ? `Contact: ${walkinContact.trim()}` : '']
      .filter(Boolean)
      .join('\n');
    const header = {
      client_id: mode === 'client' ? clientId : null,
      historical_client_name: mode === 'walkin' ? walkinName.trim() || null : null,
      status,
      notes: combinedNotes || null,
      valid_until: validUntil.trim() || null,
      discount: discountNum,
    };
    setSubmitting(true);
    try {
      let quoteId: string;
      if (initial) {
        await updateQuote(initial.id, header, cleanItems);
        quoteId = initial.id;
      } else {
        quoteId = await createQuote(header, cleanItems);
      }

      // Link back to the waiting list entry this quote was built from. A failure
      // here is logged and surfaced, but doesn't unwind the already-created quote —
      // money-adjacent records fail safe, not away.
      if (!initial && prefill?.waitlistId) {
        const quotedTotal = Math.max(
          cleanItems.reduce((s, it) => s + it.quantity * it.unit_price, 0) - discountNum,
          0,
        );
        const { error: waitlistError } = await updateWaitlistEntry(prefill.waitlistId, {
          pipeline_stage: 'quote_sent',
          status: 'active',
          quote_id: quoteId,
          quoted_price: quotedTotal,
          quote_sent_date: new Date().toISOString().slice(0, 10),
        });
        if (waitlistError) {
          console.error('[QuoteBuilder] waitlist link:', waitlistError);
        }
        router.replace({ pathname: '/(admin)/waitlist/[id]', params: { id: prefill.waitlistId } });
        return;
      }

      router.replace('/(admin)/quotes/index');
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
        <View className="px-6">
          <ClientOrWalkinPicker
            mode={mode}
            clientId={clientId}
            walkinName={walkinName}
            walkinContact={walkinContact}
            clients={clients}
            showQuickAdd={showQuickAdd}
            onSelectClient={selectClient}
            onOpenQuickAdd={() => setShowQuickAdd(true)}
            onToggleQuickAdd={() => setShowQuickAdd((v) => !v)}
            onChangeWalkinName={setWalkinName}
            onChangeWalkinContact={setWalkinContact}
            onConfirmWalkin={confirmWalkin}
          />

          <LineItemList items={items} onUpdate={updateItem} onRemove={removeItem} onAdd={addBlank} />

          {dogs.length ? (
            <View className="mt-5">
              <Typography variant="label" className="mb-2 text-silver">Quick add a dog</Typography>
              <View className="flex-row flex-wrap gap-2">
                {dogs.slice(0, 12).map((d) => (
                  <Pressable
                    key={d.id}
                    onPress={() => addDog(d.id, d.name, d.price)}
                    className="rounded-xl border border-gold/20 bg-surface px-3 py-2"
                  >
                    <Typography variant="caption" className="text-ink-muted">+ {d.name}</Typography>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null}

          <View className="mt-6 gap-3">
            <Input label="Discount (ZAR)" keyboardType="phone-pad" value={discount} onChangeText={setDiscount} />
            <Input
              label="Valid until (YYYY-MM-DD)"
              placeholder="2026-07-31"
              autoCapitalize="none"
              value={validUntil}
              onChangeText={setValidUntil}
            />
            <Input label="Notes" value={notes} onChangeText={setNotes} multiline className="h-24" />
          </View>

          <Card className="mt-2">
            <View className="flex-row justify-between">
              <Typography variant="bodyMuted">Subtotal</Typography>
              <Typography variant="body">{formatPrice(subtotal)}</Typography>
            </View>
            <View className="mt-2 flex-row justify-between border-t border-gold/10 pt-2">
              <Typography variant="subtitle">Total</Typography>
              <Typography variant="subtitle" className="text-gold">{formatPrice(total)}</Typography>
            </View>
          </Card>

          <Button label="Save & Mark Sent" onPress={() => onSave('sent')} loading={submitting} fullWidth className="mt-4" />
          <Button
            label="Save as Draft"
            variant="outline"
            onPress={() => onSave('draft')}
            loading={submitting}
            fullWidth
            className="mt-2"
          />
        </View>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}

export default function QuoteBuilderScreen() {
  const params = useLocalSearchParams<{
    id?: string;
    waitlistId?: string;
    clientId?: string;
    walkinName?: string;
    walkinContact?: string;
    dogId?: string;
    litterId?: string;
  }>();
  const { quote: initial, loading } = useQuoteDetail(params.id ?? '');

  if (params.id && loading) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center">
        <ActivityIndicator color={Colors.gold} />
      </ScreenContainer>
    );
  }
  const prefill: QuotePrefill = {
    waitlistId: params.waitlistId,
    clientId: params.clientId,
    walkinName: params.walkinName,
    walkinContact: params.walkinContact,
    dogId: params.dogId,
    litterId: params.litterId,
  };
  return (
    <QuoteBuilder key={initial?.id ?? 'new'} initial={params.id ? initial : undefined} prefill={prefill} />
  );
}
