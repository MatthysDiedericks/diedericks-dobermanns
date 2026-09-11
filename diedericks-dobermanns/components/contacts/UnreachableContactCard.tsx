import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { markContactCannotTrace, updateContact } from '@/lib/contacts/mutations';
import { parsePhone } from '@/lib/phone';
import type { UnreachableContact } from '@/lib/contacts/unreachable';
import { formatDate } from '@/lib/finance/formatters';

export function UnreachableContactCard({
  row,
  onChanged,
}: {
  row: UnreachableContact;
  onChanged: () => void;
}) {
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const parsed = parsePhone(phone);

  const onSave = async () => {
    setError(null);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setSaving(true);
    try {
      await updateContact(row.id, {
        phone: parsed.value,
        email: email.trim() || null,
      });
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const onCannotTrace = async () => {
    setSaving(true);
    setError(null);
    try {
      await markContactCannotTrace(row.id);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="rounded-xl border border-gold/20 bg-surface p-4">
      <Typography variant="subtitle" className="text-gold">
        {row.full_name || 'Unnamed'}
      </Typography>
      <Typography variant="caption" className="mt-1 text-subtle">
        {row.source || 'unknown source'}
        {row.linkedDog ? ` · Dog: ${row.linkedDog}` : ' · No linked dog'}
        {row.lastInvoiceDate
          ? ` · Last invoice ${formatDate(row.lastInvoiceDate)}`
          : ' · No invoice'}
      </Typography>
      <TextInput
        value={phone}
        onChangeText={setPhone}
        placeholder="Phone"
        placeholderTextColor={Colors.silver}
        keyboardType="phone-pad"
        className="mt-3 rounded-xl border border-gold/20 bg-background px-4 py-3 font-body text-base text-ink"
      />
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email (optional)"
        placeholderTextColor={Colors.silver}
        keyboardType="email-address"
        autoCapitalize="none"
        className="mt-2 rounded-xl border border-gold/20 bg-background px-4 py-3 font-body text-base text-ink"
      />
      {error ? (
        <Typography variant="caption" className="mt-2 text-danger">
          {error}
        </Typography>
      ) : null}
      <View className="mt-3 flex-row gap-2">
        <View className="flex-1">
          <Button
            label="Save"
            onPress={() => void onSave()}
            loading={saving}
            disabled={saving || !parsed.ok}
            fullWidth
          />
        </View>
        <Pressable
          onPress={() => void onCannotTrace()}
          disabled={saving}
          className="justify-center rounded-xl border border-gold/40 px-3"
        >
          <Typography variant="caption" className="text-gold">
            Cannot trace
          </Typography>
        </Pressable>
      </View>
    </View>
  );
}
