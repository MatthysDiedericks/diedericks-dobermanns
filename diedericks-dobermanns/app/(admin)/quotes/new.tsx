import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { LineItemList } from '@/components/finance/LineItemList';
import { type DraftLineItem } from '@/components/finance/LineItemRow';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useAdminDogs, useAdminQuotes, useClients } from '@/hooks/useAdmin';
import { saveQuote, useSubmitting, type LineItemInput } from '@/hooks/useMutations';
import { formatPrice } from '@/lib/format';
import type { Quote } from '@/types/app.types';

let keyCounter = 0;
const nextKey = () => `item-${keyCounter++}`;

function seedItems(quote?: Quote): DraftLineItem[] {
  if (!quote?.items?.length) {
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

function QuoteBuilder({ initial }: { initial?: Quote }) {
  const router = useRouter();
  const { submitting, run } = useSubmitting();
  const { data: clients } = useClients();
  const { data: dogs } = useAdminDogs();

  const [clientId, setClientId] = useState<string | null>(initial?.client_id ?? null);
  const [items, setItems] = useState<DraftLineItem[]>(() => seedItems(initial));
  const [discount, setDiscount] = useState(initial ? String(initial.discount) : '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [validUntil, setValidUntil] = useState(initial?.valid_until ?? '');

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
      {
        key: nextKey(),
        item_type: 'dog',
        dog_id: dogId,
        description: name,
        quantity: 1,
        unit_price: price ?? 0,
      },
    ]);
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
    const { error } = await run(() =>
      saveQuote(
        {
          client_id: clientId,
          status,
          notes: notes.trim() || null,
          valid_until: validUntil.trim() || null,
          discount: discountNum,
        },
        cleanItems,
        initial?.id,
      ),
    );
    if (!error) router.replace('/(admin)/quotes/index');
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenContainer keyboardShouldPersistTaps="handled">
        <PageHeader eyebrow="Sales" title={initial ? 'Edit Quote' : 'New Quote'} />
        <View className="px-6">
          <Typography variant="label" className="mb-2 text-silver">Client</Typography>
          <View className="mb-5 flex-row flex-wrap gap-2">
            {clients.length === 0 ? (
              <Typography variant="caption">No clients yet.</Typography>
            ) : (
              clients.map((c) => {
                const active = clientId === c.id;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => setClientId(active ? null : c.id)}
                    className={`rounded-xl border px-4 py-2.5 ${
                      active ? 'border-gold bg-gold/15' : 'border-gold/20 bg-surface'
                    }`}
                  >
                    <Typography variant="caption" className={active ? 'text-gold' : 'text-ink-muted'}>
                      {c.full_name ?? 'Unnamed'}
                    </Typography>
                  </Pressable>
                );
              })
            )}
          </View>

          <LineItemList
            items={items}
            onUpdate={updateItem}
            onRemove={removeItem}
            onAdd={addBlank}
          />

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
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data: quotes, loading } = useAdminQuotes();
  const initial = id ? quotes.find((q) => q.id === id) : undefined;

  if (id && loading) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center">
        <ActivityIndicator color={Colors.gold} />
      </ScreenContainer>
    );
  }
  return <QuoteBuilder key={initial?.id ?? 'new'} initial={initial} />;
}
