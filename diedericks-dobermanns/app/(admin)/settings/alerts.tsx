import { useCallback, useEffect, useState } from 'react';
import { Alert, TextInput, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import {
  EXPIRING_KINDS,
  LEAD_SETTING_KEY,
  LEAD_SETTING_LABEL,
  SEEDED_LEAD_DAYS,
} from '@/lib/alerts/leadDays';
import { requireSupabase } from '@/lib/supabase';

const KEYS = EXPIRING_KINDS.map((kind) => LEAD_SETTING_KEY[kind]);

export default function AlertLeadSettingsScreen() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const supabase = requireSupabase();
    const { data, error } = await supabase.from('app_settings').select('key, value').in('key', KEYS);
    if (error) {
      Alert.alert('Could not load', error.message);
      return;
    }
    const next: Record<string, string> = {};
    for (const kind of EXPIRING_KINDS) next[LEAD_SETTING_KEY[kind]] = String(SEEDED_LEAD_DAYS[kind]);
    for (const row of data ?? []) next[row.key] = row.value ?? next[row.key];
    setValues(next);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setBusy(true);
    try {
      const supabase = requireSupabase();
      const rows = EXPIRING_KINDS.map((kind) => ({
        key: LEAD_SETTING_KEY[kind],
        value: values[LEAD_SETTING_KEY[kind]] ?? String(SEEDED_LEAD_DAYS[kind]),
        description:
          kind === 'document'
            ? 'Days before a document expiry shows on the admin alert. 30, not 7 — a kennel registration cannot be renewed in a week.'
            : `Days before a ${kind} due date shows on the admin alert.`,
      }));
      const { error } = await supabase.from('app_settings').upsert(rows, { onConflict: 'key' });
      if (error) throw new Error(error.message);
      Alert.alert('Saved', 'Alert lead times updated.');
    } catch (error) {
      Alert.alert('Could not save', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Settings" title="Alert lead times" />
      <View className="gap-3 px-6 pb-10">
        <Card className="p-4">
          <Typography variant="bodyMuted">
            Documents default to 30 days, not 7. A kennel registration cannot be renewed in a week.
            Everything else starts at the shorter lead below. These only change the on-screen alert.
            They do not send email.
          </Typography>
        </Card>
        <Card className="p-4">
          {EXPIRING_KINDS.map((kind) => (
            <View key={kind} className="mb-3">
              <Typography variant="label">{LEAD_SETTING_LABEL[kind]}</Typography>
              <TextInput
                value={values[LEAD_SETTING_KEY[kind]] ?? ''}
                onChangeText={(text) =>
                  setValues((current) => ({
                    ...current,
                    [LEAD_SETTING_KEY[kind]]: text.replace(/[^0-9]/g, ''),
                  }))
                }
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
