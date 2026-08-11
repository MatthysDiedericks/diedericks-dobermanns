import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { useWhelpingTemperatures } from '@/hooks/useWhelpingTemperatures';
import { WHELP_TEMP_DROP_C, type HeatCycleRecord } from '@/lib/heats/constants';
import { formatKennelDate } from '@/lib/kennel/formatters';

/** Fastest path for 3am whelping watch — big number, now, one tap. */
export function TemperatureLogScreen({
  cycle,
  dogName,
}: {
  cycle: HeatCycleRecord | null;
  dogName: string;
}) {
  const { temps, loading, error, refresh, addTemperature } = useWhelpingTemperatures(
    cycle?.id ?? null,
  );
  const [temp, setTemp] = useState('');
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const previousThree = useMemo(
    () => [...temps].sort((a, b) => b.taken_at.localeCompare(a.taken_at)).slice(0, 3),
    [temps],
  );

  if (!cycle) {
    return (
      <Typography variant="bodyMuted" className="py-8 text-center">
        No cycle available for temperature logging.
      </Typography>
    );
  }

  const save = async () => {
    const value = Number(temp);
    if (!Number.isFinite(value)) return;
    setSaving(true);
    setAlert(null);
    try {
      const takenAt = new Date().toISOString();
      const result = await addTemperature({
        taken_at: takenAt,
        temp_c: value,
        dogName,
      });
      if (result.dropAlert) {
        const time = new Date(takenAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
        setAlert(
          `Temperature dropped to ${value.toFixed(1)} °C at ${time} — whelping likely within 24 hours.`,
        );
      }
      setTemp('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void refresh().finally(() => setRefreshing(false));
          }}
        />
      }
      keyboardShouldPersistTaps="handled"
      className="pb-10"
    >
      {alert ? (
        <View className="mb-4 rounded-xl border border-gold/40 bg-gold/10 p-4">
          <Typography variant="subtitle" className="text-gold">
            Temperature drop
          </Typography>
          <Typography variant="body" className="mt-2">
            {alert}
          </Typography>
          <Typography variant="caption" className="mt-2 text-muted">
            One reading is not proof. Recent:{' '}
            {previousThree
              .map(
                (t) =>
                  `${Number(t.temp_c).toFixed(1)} °C (${new Date(t.taken_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`,
              )
              .join(' · ')}
          </Typography>
        </View>
      ) : null}

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
        autoFocus
      />
      <Button
        label={saving ? 'Saving…' : 'Save temperature'}
        onPress={() => void save()}
        loading={saving}
        fullWidth
      />

      {error ? (
        <Typography variant="caption" className="mt-3 text-danger">
          {error}
        </Typography>
      ) : null}
      {loading ? (
        <Typography variant="caption" className="mt-3 text-muted">
          Loading…
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
    </ScrollView>
  );
}
