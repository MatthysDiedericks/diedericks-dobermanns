import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { useWhelpingTemperatures } from '@/hooks/useWhelpingTemperatures';
import { WHELP_TEMP_DROP_C, type HeatCycleRecord } from '@/lib/heats/constants';
import {
  dropAlertMessage,
  latestDropAndPrevious,
  previousThreeCaption,
} from '@/lib/heats/whelpTempLogic';
import { formatKennelDate } from '@/lib/kennel/formatters';

/** Fastest path for 3am whelping watch — big number, now, one tap. Matches WhelpingWatch. */
export function TemperatureLogScreen({
  cycle,
  dogName,
}: {
  cycle: HeatCycleRecord | null;
  dogName: string;
}) {
  const { temps, loading, error, addTemperature } = useWhelpingTemperatures(
    cycle?.id ?? null,
  );
  const [temp, setTemp] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { latestDrop, previousThree } = latestDropAndPrevious(temps);

  if (!cycle) {
    return (
      <Typography variant="bodyMuted" className="py-8 text-center">
        No cycle available for temperature logging.
      </Typography>
    );
  }

  const save = async () => {
    const value = Number(temp);
    setSaveError(null);
    setSaving(true);
    try {
      const result = await addTemperature({
        taken_at: new Date().toISOString(),
        temp_c: value,
        dogName,
      });
      if (result.error) {
        setSaveError(result.error);
        return;
      }
      setTemp('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="pb-10">
      <Typography variant="caption" className="mb-2 text-muted">
        Rectal temperature (°C) — time defaults to now
      </Typography>
      <TextInput
        value={temp}
        onChangeText={setTemp}
        keyboardType="decimal-pad"
        placeholder="37.5"
        placeholderTextColor="#8C8474"
        className="mb-4 rounded-2xl border border-gold/30 bg-[#111008] px-4 py-6 text-center font-display text-4xl text-ink"
      />
      <Button
        label={saving ? 'Saving…' : 'Save temperature'}
        onPress={() => void save()}
        loading={saving}
        fullWidth
      />

      {saveError || error ? (
        <Typography variant="caption" className="mt-3 text-danger">
          {saveError ?? error}
        </Typography>
      ) : null}

      {latestDrop ? (
        <View className="mt-4 rounded-xl border border-gold/40 bg-gold/10 p-4">
          <Typography variant="subtitle" className="text-gold">
            Temperature drop
          </Typography>
          <Typography variant="body" className="mt-2">
            {dropAlertMessage(latestDrop)}
          </Typography>
          <Typography variant="caption" className="mt-2 text-muted">
            {previousThreeCaption(previousThree)}
          </Typography>
        </View>
      ) : null}

      {loading ? (
        <Typography variant="caption" className="mt-3 text-muted">
          Loading…
        </Typography>
      ) : temps.length === 0 ? (
        <Typography variant="caption" className="mt-3 text-muted">
          No temperatures logged yet.
        </Typography>
      ) : null}

      <View className="mt-6">
        {[...temps].reverse().map((t) => {
          const drop = Number(t.temp_c) < WHELP_TEMP_DROP_C;
          return (
            <Pressable
              key={t.id}
              className={`flex-row justify-between border-b border-gold/10 py-3 ${
                drop ? 'bg-gold/5' : ''
              }`}
            >
              <Typography variant="caption" className="text-muted">
                {formatKennelDate(t.taken_at)}{' '}
                {new Date(t.taken_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Typography>
              <Typography variant="body" className={drop ? 'text-gold' : ''}>
                {Number(t.temp_c).toFixed(1)} °C
              </Typography>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
