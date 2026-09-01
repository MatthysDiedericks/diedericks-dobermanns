import { useState } from 'react';
import { Alert, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DateField } from '@/components/ui/DateField';
import { Typography } from '@/components/ui/Typography';
import { holdChipLabel, isQuoteOnHold } from '@/lib/finance/quoteLapse';
import { setQuoteLapseHold } from '@/lib/finance/quoteLapseHold';

export function QuoteLapseHoldCard({
  quoteId,
  holdUntil,
  holdReason,
  onSaved,
}: {
  quoteId: string;
  holdUntil: string | null;
  holdReason: string | null;
  onSaved: () => void;
}) {
  const [until, setUntil] = useState(holdUntil?.slice(0, 10) ?? '');
  const [reason, setReason] = useState(holdReason ?? '');
  const [busy, setBusy] = useState(false);
  const held = isQuoteOnHold(holdUntil);

  const save = async (clear: boolean) => {
    setBusy(true);
    try {
      await setQuoteLapseHold(quoteId, clear ? null : until || null, reason);
      onSaved();
    } catch (e) {
      Alert.alert('Could not save hold', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <Typography variant="subtitle" className="text-gold">
        Lapse hold
      </Typography>
      {held && holdUntil ? (
        <Typography variant="body" className="mt-2 text-amber-200">
          {holdChipLabel(holdUntil)}
          {holdReason ? ` — ${holdReason}` : ''}
        </Typography>
      ) : (
        <Typography variant="caption" className="mt-2">
          Pause reminders and expiry while you wait. A date and a reason are required.
        </Typography>
      )}
      <DateField label="Hold until" value={until} onChange={setUntil} />
      <Typography variant="label" className="mb-2">
        Reason (required)
      </Typography>
      <TextInput
        value={reason}
        onChangeText={setReason}
        placeholder="Funds clearing — agreed to wait."
        placeholderTextColor="#8a8378"
        multiline
        className="mb-3 rounded-xl border border-gold/40 bg-surface px-4 py-3 text-text"
      />
      <View className="flex-row flex-wrap gap-2">
        <Button label="Hold this quote" onPress={() => void save(false)} loading={busy} />
        {holdUntil ? (
          <Button label="Clear hold" variant="outline" onPress={() => void save(true)} loading={busy} />
        ) : null}
      </View>
    </Card>
  );
}
