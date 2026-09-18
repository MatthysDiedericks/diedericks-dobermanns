import { useCallback, useEffect, useState } from 'react';
import { Alert, TextInput, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import {
  DAM_EXPECTED_LITTERS_KEY,
  DEFAULT_EXPECTED_PRODUCTIVE_LITTERS,
  DEFAULT_NURSING_MULTIPLIER,
  DEFAULT_PUPPY_WEIGHT,
  DOG_DAYS_NURSING_KEY,
  DOG_DAYS_PUPPY_KEY,
} from '@/lib/finance/allocationSettings';
import { requireSupabase } from '@/lib/supabase';

const KEYS = [DOG_DAYS_NURSING_KEY, DOG_DAYS_PUPPY_KEY, DAM_EXPECTED_LITTERS_KEY] as const;

export default function AllocationSettingsScreen() {
  const [values, setValues] = useState<Record<string, string>>({
    [DOG_DAYS_NURSING_KEY]: String(DEFAULT_NURSING_MULTIPLIER),
    [DOG_DAYS_PUPPY_KEY]: String(DEFAULT_PUPPY_WEIGHT),
    [DAM_EXPECTED_LITTERS_KEY]: String(DEFAULT_EXPECTED_PRODUCTIVE_LITTERS),
  });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const supabase = requireSupabase();
    const { data, error } = await supabase.from('app_settings').select('key, value').in('key', [...KEYS]);
    if (error) {
      Alert.alert('Could not load', error.message);
      return;
    }
    const next: Record<string, string> = {
      [DOG_DAYS_NURSING_KEY]: String(DEFAULT_NURSING_MULTIPLIER),
      [DOG_DAYS_PUPPY_KEY]: String(DEFAULT_PUPPY_WEIGHT),
      [DAM_EXPECTED_LITTERS_KEY]: String(DEFAULT_EXPECTED_PRODUCTIVE_LITTERS),
    };
    for (const row of data ?? []) if (row.value) next[row.key] = row.value;
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
      Alert.alert('Saved', 'Allocation settings updated.');
    } catch (e) {
      Alert.alert('Could not save', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Settings" title="Kennel cost allocation" />
      <View className="gap-3 px-6 pb-10">
        <Card className="p-4">
          <Typography variant="bodyMuted">
            Shared costs (feed, staff, transport) are spread by weighted dog-days. Tune the
            multipliers rather than arguing with a hard-coded number.
          </Typography>
          <Typography variant="label" className="mt-4">
            Nursing dam weight
          </Typography>
          <TextInput
            value={values[DOG_DAYS_NURSING_KEY]}
            onChangeText={(v) => setValues((p) => ({ ...p, [DOG_DAYS_NURSING_KEY]: v }))}
            keyboardType="decimal-pad"
            className="mt-1 border-b border-gold/30 pb-2 text-white"
          />
          <Typography variant="caption" className="mt-1">
            Default 2.0 — she counts as two adults while nursing. Extra above 1.0 goes to the litter.
          </Typography>
          <Typography variant="label" className="mt-4">
            Puppy dog-day weight
          </Typography>
          <TextInput
            value={values[DOG_DAYS_PUPPY_KEY]}
            onChangeText={(v) => setValues((p) => ({ ...p, [DOG_DAYS_PUPPY_KEY]: v }))}
            keyboardType="decimal-pad"
            className="mt-1 border-b border-gold/30 pb-2 text-white"
          />
          <Typography variant="caption" className="mt-1">
            Default 0.5 — a puppy on the ground is half an adult dog-day.
          </Typography>
          <Typography variant="label" className="mt-4">
            Expected productive litters
          </Typography>
          <TextInput
            value={values[DAM_EXPECTED_LITTERS_KEY]}
            onChangeText={(v) => setValues((p) => ({ ...p, [DAM_EXPECTED_LITTERS_KEY]: v }))}
            keyboardType="number-pad"
            className="mt-1 border-b border-gold/30 pb-2 text-white"
          />
          <Typography variant="caption" className="mt-1">
            Default 5 — amortise a dam purchase across this many litters.
          </Typography>
          <Button label={busy ? 'Saving…' : 'Save'} onPress={() => void save()} className="mt-6" disabled={busy} />
        </Card>
      </View>
    </ScreenContainer>
  );
}
