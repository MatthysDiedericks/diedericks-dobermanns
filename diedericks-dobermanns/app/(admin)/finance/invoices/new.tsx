import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import {
  DogLinePicker,
  dogLineDescription,
  dogLineItemType,
  type PickableDog,
} from '@/components/finance/DogLinePicker';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useClients } from '@/hooks/useAdmin';
import { createInvoice } from '@/hooks/useInvoices';
import { formatAmount } from '@/lib/finance/formatters';
import { requireSupabase } from '@/lib/supabase';
import type { DraftLineItem, InvoiceItemType } from '@/types/finance';

const ITEM_TYPES: InvoiceItemType[] = [
  'dog_sale',
  'deposit',
  'training_fee',
  'transport',
  'other',
];

function emptyLine(): DraftLineItem {
  return { description: '', item_type: 'dog_sale', quantity: 1, unit_price: 0 };
}

function showsDogPicker(type: InvoiceItemType): boolean {
  return type === 'dog_sale' || type === 'deposit';
}

export default function NewFinanceInvoiceScreen() {
  const router = useRouter();
  const { data: clients } = useClients();
  const today = new Date().toISOString().slice(0, 10);
  const dueDefault = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);

  const [clientId, setClientId] = useState('');
  const [issueDate, setIssueDate] = useState(today);
  const [dueDate, setDueDate] = useState(dueDefault);
  const [notes, setNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');
  const [discount, setDiscount] = useState('0');
  const [items, setItems] = useState<DraftLineItem[]>([emptyLine()]);
  const [pickerOpen, setPickerOpen] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const discountNum = Number(discount) || 0;
  const total = Math.max(subtotal - discountNum, 0);

  const updateItem = (idx: number, patch: Partial<DraftLineItem>) => {
    setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, ...patch } : item)));
  };

  const handleDogSelect = (idx: number, dog: PickableDog) => {
    const current = items[idx];
    if (!current) return;
    if (current.item_type === 'deposit') {
      updateItem(idx, { description: dogLineDescription(dog), dog_id: dog.id });
    } else {
      updateItem(idx, {
        description: dogLineDescription(dog),
        item_type: dogLineItemType(dog),
        dog_id: dog.id,
      });
    }
    setPickerOpen((p) => ({ ...p, [idx]: false }));
  };

  const promptReservedStatus = (dogIds: string[]): Promise<void> =>
    new Promise((resolve) => {
      if (dogIds.length === 0) {
        resolve();
        return;
      }
      const [first, ...rest] = dogIds;
      Alert.alert('Update dog status to Reserved?', undefined, [
        {
          text: 'Not now',
          style: 'cancel',
          onPress: () => {
            if (rest.length > 0) void promptReservedStatus(rest).then(resolve);
            else resolve();
          },
        },
        {
          text: 'Set to Reserved',
          onPress: () => {
            void (async () => {
              try {
                const supabase = requireSupabase();
                await supabase.from('dogs').update({ status: 'reserved' }).eq('id', first);
              } catch {
                /* non-blocking */
              }
              if (rest.length > 0) await promptReservedStatus(rest);
              resolve();
            })();
          },
        },
      ]);
    });

  const handleSave = async (send: boolean) => {
    if (!clientId) {
      setError('Select a client.');
      return;
    }
    if (items.some((i) => !i.description.trim())) {
      setError('Each line item needs a description.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const dogSaleIds = items
        .filter((i) => i.item_type === 'dog_sale' && i.dog_id)
        .map((i) => i.dog_id as string);

      const id = await createInvoice({
        client_id: clientId,
        issue_date: issueDate,
        due_date: dueDate,
        notes,
        internal_notes: internalNotes,
        discount_amount: discountNum,
        items,
        send,
      });

      await promptReservedStatus(dogSaleIds);
      router.replace({ pathname: '/(admin)/finance/invoices/[id]', params: { id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create invoice');
      setSaving(false);
    }
  };

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Finance" title="New invoice" />

      <ScrollView className="px-6 pb-12" keyboardShouldPersistTaps="handled">
        <Typography variant="label" className="mb-2">Client</Typography>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
          {clients.map((c) => (
            <Pressable
              key={c.id}
              onPress={() => setClientId(c.id)}
              className={`mr-2 rounded-full border px-4 py-2 ${
                clientId === c.id ? 'border-gold bg-gold/15' : 'border-gold/30'
              }`}
            >
              <Typography variant="caption">{c.full_name}</Typography>
            </Pressable>
          ))}
        </ScrollView>

        <View className="mb-4 flex-row gap-3">
          <View className="flex-1">
            <Typography variant="caption" className="mb-1">Issue date</Typography>
            <Input value={issueDate} onChangeText={setIssueDate} placeholder="YYYY-MM-DD" />
          </View>
          <View className="flex-1">
            <Typography variant="caption" className="mb-1">Due date</Typography>
            <Input value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" />
          </View>
        </View>

        <Typography variant="label" className="mb-2">Line items</Typography>
        {items.map((item, idx) => (
          <Card key={idx} className="mb-3">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
              {ITEM_TYPES.map((t) => (
                <Pressable
                  key={t}
                  onPress={() => updateItem(idx, { item_type: t, dog_id: null })}
                  className={`mr-2 rounded-full border px-3 py-1 ${
                    item.item_type === t ? 'border-gold bg-gold/15' : 'border-gold/30'
                  }`}
                >
                  <Typography variant="caption">{t.replace(/_/g, ' ')}</Typography>
                </Pressable>
              ))}
            </ScrollView>

            {showsDogPicker(item.item_type) ? (
              <View className="mb-2">
                <Pressable
                  onPress={() => setPickerOpen((p) => ({ ...p, [idx]: !p[idx] }))}
                  className="mb-2 self-start rounded-full border border-gold/40 px-3 py-1.5"
                >
                  <Typography variant="caption" className="text-gold">
                    {pickerOpen[idx] ? 'Hide dog picker' : 'Pick a dog'}
                  </Typography>
                </Pressable>
                {pickerOpen[idx] ? (
                  <DogLinePicker onSelect={(dog) => handleDogSelect(idx, dog)} />
                ) : null}
              </View>
            ) : null}

            <Input
              value={item.description}
              onChangeText={(v) => updateItem(idx, { description: v })}
              placeholder="Description"
              className="mb-2"
            />
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Input
                  value={String(item.quantity)}
                  onChangeText={(v) => updateItem(idx, { quantity: Number(v) || 0 })}
                  placeholder="Qty"
                  keyboardType="numeric"
                />
              </View>
              <View className="flex-1">
                <Input
                  value={String(item.unit_price)}
                  onChangeText={(v) => updateItem(idx, { unit_price: Number(v) || 0 })}
                  placeholder="Unit price"
                  keyboardType="numeric"
                />
              </View>
              <Typography variant="label" className="pt-3 text-gold">
                {formatAmount(item.quantity * item.unit_price)}
              </Typography>
            </View>
            {items.length > 1 ? (
              <Pressable onPress={() => setItems((p) => p.filter((_, i) => i !== idx))}>
                <Typography variant="caption" className="mt-2 text-danger">Remove</Typography>
              </Pressable>
            ) : null}
          </Card>
        ))}

        <Pressable
          onPress={() => setItems((p) => [...p, emptyLine()])}
          className="mb-4"
        >
          <Typography variant="label" className="text-gold">+ Add line item</Typography>
        </Pressable>

        <Card className="mb-4">
          <View className="flex-row justify-between py-1">
            <Typography variant="body">Subtotal</Typography>
            <Typography variant="label">{formatAmount(subtotal)}</Typography>
          </View>
          <View className="mb-2">
            <Typography variant="caption" className="mb-1">Discount</Typography>
            <Input value={discount} onChangeText={setDiscount} keyboardType="numeric" />
          </View>
          <View className="flex-row justify-between border-t border-gold/20 pt-2">
            <Typography variant="subtitle">Total</Typography>
            <Typography variant="display" className="text-gold">{formatAmount(total)}</Typography>
          </View>
        </Card>

        <Input
          value={notes}
          onChangeText={setNotes}
          placeholder="Notes for client"
          className="mb-3"
        />
        <Input
          value={internalNotes}
          onChangeText={setInternalNotes}
          placeholder="Internal notes"
          className="mb-4"
        />

        {error ? (
          <Typography variant="caption" className="mb-3 text-danger">{error}</Typography>
        ) : null}

        <View className="gap-3">
          <Button
            label="Save as draft"
            variant="secondary"
            loading={saving}
            onPress={() => handleSave(false)}
            fullWidth
          />
          <Button
            label="Save & mark sent"
            loading={saving}
            onPress={() => handleSave(true)}
            fullWidth
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
