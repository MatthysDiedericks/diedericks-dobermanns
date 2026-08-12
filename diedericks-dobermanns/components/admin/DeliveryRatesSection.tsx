import { useState } from 'react';
import { Alert, Pressable, Switch, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { useDeliveryRates } from '@/hooks/useDeliveryRates';
import { formatAmount } from '@/lib/finance/formatters';
import type { DeliveryRate } from '@/lib/finance/deliveryRates';

function RateCard({
  rate,
  onSave,
  onRemove,
}: {
  rate: DeliveryRate;
  onSave: (
    id: string,
    patch: {
      label: string;
      amount: number;
      notes: string | null;
      active: boolean;
      sort_order: number;
    },
  ) => Promise<{ error: string | null }>;
  onRemove: (id: string) => Promise<{ error: string | null }>;
}) {
  const [label, setLabel] = useState(rate.label);
  const [amount, setAmount] = useState(String(rate.amount));
  const [notes, setNotes] = useState(rate.notes ?? '');
  const [active, setActive] = useState(rate.active);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const { error } = await onSave(rate.id, {
      label: label.trim() || rate.label,
      amount: Number(amount) || 0,
      notes: notes.trim() || null,
      active,
      sort_order: rate.sort_order,
    });
    setBusy(false);
    if (error) Alert.alert('Could not save', error);
  }

  function remove() {
    Alert.alert('Remove delivery rate', `Remove “${rate.label}”?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            const { error } = await onRemove(rate.id);
            if (error) Alert.alert('Could not remove', error);
          })();
        },
      },
    ]);
  }

  return (
    <Card className="p-4">
      <Input label="Label" value={label} onChangeText={setLabel} />
      <Input
        label="Amount (ZAR)"
        keyboardType="phone-pad"
        value={amount}
        onChangeText={setAmount}
      />
      <Input
        label="Notes"
        value={notes}
        onChangeText={setNotes}
        placeholder="Optional"
      />
      <View className="mb-3 flex-row items-center justify-between">
        <Typography variant="bodyMuted">Active in quote builder</Typography>
        <Switch value={active} onValueChange={setActive} />
      </View>
      <Typography variant="caption" className="mb-3 text-gold">
        {formatAmount(Number(amount) || 0)}
      </Typography>
      <View className="flex-row gap-2">
        <Button label={busy ? 'Saving…' : 'Save'} onPress={() => void save()} disabled={busy} />
        <Pressable onPress={remove} className="justify-center px-3">
          <Typography variant="caption" className="text-danger">
            Remove
          </Typography>
        </Pressable>
      </View>
    </Card>
  );
}

export function DeliveryRatesSection() {
  const { rates, loading, error, save, add, remove } = useDeliveryRates();
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!label.trim()) {
      Alert.alert('Label required', 'Give this delivery rate a name.');
      return;
    }
    setBusy(true);
    const { error: err } = await add({
      label: label.trim(),
      amount: Number(amount) || 0,
      notes: notes.trim() || null,
    });
    setBusy(false);
    if (err) Alert.alert('Could not add', err);
    else {
      setLabel('');
      setAmount('');
      setNotes('');
    }
  }

  return (
    <View className="mt-8 gap-3">
      <Typography variant="subtitle" className="text-gold">
        Delivery rates
      </Typography>
      <Typography variant="bodyMuted">
        Presets when a quote line is type delivery. Amount and description stay editable after
        picking.
      </Typography>

      {error ? (
        <Typography variant="body" className="text-danger">
          {error}
        </Typography>
      ) : null}

      {loading ? (
        <Typography variant="bodyMuted">Loading…</Typography>
      ) : rates.length === 0 ? (
        <EmptyState
          title="No delivery rates set yet"
          message="Add one below. Until then the quote builder shows an empty preset list."
        />
      ) : (
        rates.map((rate) => (
          <RateCard key={rate.id} rate={rate} onSave={save} onRemove={remove} />
        ))
      )}

      <Card className="p-4">
        <Typography variant="caption" className="mb-2 text-gold">
          Add delivery rate
        </Typography>
        <Input label="Label" value={label} onChangeText={setLabel} placeholder="e.g. Local delivery" />
        <Input
          label="Amount (ZAR)"
          keyboardType="phone-pad"
          value={amount}
          onChangeText={setAmount}
        />
        <Input label="Notes" value={notes} onChangeText={setNotes} placeholder="Optional" />
        <Button label={busy ? 'Adding…' : 'Add rate'} onPress={() => void create()} disabled={busy} />
      </Card>
    </View>
  );
}
