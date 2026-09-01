import { useCallback, useEffect, useState } from 'react';
import { Alert, Switch, TextInput, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { requireSupabase } from '@/lib/supabase';

const KEYS = [
  'quote_validity_days',
  'quote_lapse_days',
  'quote_reminder_first_days',
  'quote_reminder_final_days',
  'quote_lapse_enabled',
] as const;

const DAY_FIELDS: { key: (typeof KEYS)[number]; label: string }[] = [
  { key: 'quote_validity_days', label: 'Quote validity (days)' },
  { key: 'quote_lapse_days', label: 'Quote lapse (days)' },
  { key: 'quote_reminder_first_days', label: 'First reminder (days of silence)' },
  { key: 'quote_reminder_final_days', label: 'Final notice (days of silence)' },
];

export default function QuoteLapseSettingsScreen() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const supabase = requireSupabase();
    const { data, error } = await supabase.from('app_settings').select('key, value').in('key', [...KEYS]);
    if (error) {
      Alert.alert('Could not load', error.message);
      return;
    }
    const next: Record<string, string> = {
      quote_validity_days: '90',
      quote_lapse_days: '90',
      quote_reminder_first_days: '30',
      quote_reminder_final_days: '60',
      quote_lapse_enabled: 'true',
    };
    for (const row of data ?? []) next[row.key] = row.value;
    setValues(next);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setBusy(true);
    try {
      const supabase = requireSupabase();
      const rows = KEYS.map((key) => ({ key, value: values[key] ?? '' }));
      const { error } = await supabase.from('app_settings').upsert(rows, { onConflict: 'key' });
      if (error) throw new Error(error.message);
      Alert.alert('Saved', 'Lapse ladder settings updated.');
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const enabled = (values.quote_lapse_enabled ?? 'true') !== 'false';

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Settings" title="Quote lapse" />
      <View className="gap-3 px-6 pb-10">
        <Card className="p-4">
          <Typography variant="bodyMuted">
            quote_validity_days is the same promise as quote_lapse_days. Keep them in step —
            the ladder lapses on the date printed on the quote.
          </Typography>
          <View className="mt-4 flex-row items-center justify-between">
            <Typography variant="label">Automatic lapse</Typography>
            <Switch
              value={enabled}
              onValueChange={(on) => setValues((v) => ({ ...v, quote_lapse_enabled: on ? 'true' : 'false' }))}
            />
          </View>
          <Typography variant="caption" className="mt-2">
            Kill switch. Turn off to stop reminders, expiry and dog release immediately.
          </Typography>
        </Card>
        <Card className="p-4">
          {DAY_FIELDS.map((f) => (
            <View key={f.key} className="mb-3">
              <Typography variant="label">{f.label}</Typography>
              <TextInput
                value={values[f.key] ?? ''}
                onChangeText={(t) => setValues((v) => ({ ...v, [f.key]: t.replace(/[^0-9]/g, '') }))}
                keyboardType="number-pad"
                className="mt-1 rounded-xl border border-gold/40 bg-surface px-4 py-3 text-text"
              />
            </View>
          ))}
        </Card>
        <Button label="Save" onPress={() => void save()} loading={busy} fullWidth />
      </View>
    </ScreenContainer>
  );
}
