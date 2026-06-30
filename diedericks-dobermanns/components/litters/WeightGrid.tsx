import { useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import {
  parseWeightInput,
  type LitterPuppy,
  type PuppyWeightLog,
} from '@/hooks/useLitterWeights';
import { CollarDot } from '@/lib/litters/collarColours';
import {
  defaultSession,
  formatWeightGrams,
  weekNumberFromWhelp,
  type WeighingSession,
} from '@/lib/litters/weighingSchedule';
import { showError, showSaved } from '@/lib/dogDetail/feedback';
import { formatKennelDate } from '@/lib/kennel/formatters';

interface WeightGridProps {
  puppies: LitterPuppy[];
  weightsByPuppyId: Map<string, PuppyWeightLog[]>;
  whelpDate: string | null;
  onBatchSave: (
    entries: { puppyId: string; weightKg: number }[],
    session: WeighingSession,
    recordedAt: Date,
  ) => Promise<void>;
}

function cellKey(puppyId: string, date: string, session: string | null) {
  return `${puppyId}:${date}:${session ?? 'daily'}`;
}

export function WeightGrid({ puppies, weightsByPuppyId, whelpDate, onBatchSave }: WeightGridProps) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const [session, setSession] = useState<WeighingSession>(defaultSession(now));
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const dates = useMemo(() => {
    const set = new Set<string>([today]);
    weightsByPuppyId.forEach((logs) => logs.forEach((l) => set.add(l.recorded_date)));
    return [...set].sort();
  }, [weightsByPuppyId, today]);

  const logMap = useMemo(() => {
    const m = new Map<string, PuppyWeightLog>();
    weightsByPuppyId.forEach((logs, puppyId) => {
      logs.forEach((l) => m.set(cellKey(puppyId, l.recorded_date, l.session), l));
    });
    return m;
  }, [weightsByPuppyId]);

  async function handleSave() {
    const entries: { puppyId: string; weightKg: number }[] = [];
    for (const p of puppies) {
      const raw = inputs[p.id];
      if (!raw?.trim()) continue;
      const kg = parseWeightInput(raw);
      if (kg == null) {
        showError('Enter valid weights in grams.');
        return;
      }
      entries.push({ puppyId: p.id, weightKg: kg });
    }
    if (!entries.length) {
      showError('Enter at least one weight.');
      return;
    }
    setSaving(true);
    try {
      await onBatchSave(entries, session, now);
      showSaved();
      setInputs({});
    } catch {
      showError();
    } finally {
      setSaving(false);
    }
  }

  const weekHeader = whelpDate ? `Week ${weekNumberFromWhelp(whelpDate, today)}` : '';

  return (
    <View className="mb-6">
      <Typography variant="label" className="mb-2 text-gold">
        WEIGHING SESSION
      </Typography>
      <View className="mb-3 flex-row gap-2">
        {(['AM', 'PM', 'daily'] as const).map((s) => (
          <Pressable
            key={s}
            onPress={() => setSession(s)}
            className={`rounded-full border px-3 py-2 ${session === s ? 'border-gold bg-gold/15' : 'border-gold/25'}`}
          >
            <Typography variant="caption">{s === 'daily' ? 'Daily' : s}</Typography>
          </Pressable>
        ))}
      </View>
      <Typography variant="caption" className="mb-3 text-subtle">
        Date: {formatKennelDate(today)} · {weekHeader}
      </Typography>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          <View className="flex-row border-b border-gold/20 pb-2">
            <View className="w-8" />
            <View className="w-32">
              <Typography variant="caption">Puppy</Typography>
            </View>
            {dates.map((d) => (
              <View key={d} className="w-24 px-1">
                <Typography variant="caption">{formatKennelDate(d)}</Typography>
              </View>
            ))}
          </View>
          {puppies.map((p, idx) => (
            <View key={p.id} className="flex-row items-center border-b border-gold/10 py-2">
              <Typography variant="caption" className="w-8">
                {idx + 1}
              </Typography>
              <View className="w-32 flex-row items-center gap-1">
                <CollarDot colour={p.collar_colour} size={8} />
                <Typography variant="caption" numberOfLines={1}>
                  {p.name}
                </Typography>
              </View>
              {dates.map((d) => {
                const isToday = d === today;
                const log = logMap.get(cellKey(p.id, d, isToday ? session : 'daily'));
                if (isToday) {
                  return (
                    <View key={d} className="w-24 px-1">
                      <TextInput
                        value={inputs[p.id] ?? ''}
                        onChangeText={(v) => setInputs((s) => ({ ...s, [p.id]: v }))}
                        placeholder="g"
                        keyboardType="number-pad"
                        placeholderTextColor="#8C8474"
                        className="rounded border border-gold/30 bg-black-rich px-2 py-1 font-body text-xs text-ink"
                      />
                    </View>
                  );
                }
                return (
                  <View key={d} className="w-24 px-1">
                    <Typography variant="caption" className="text-subtle">
                      {log ? formatWeightGrams(log.weight_kg) : '—'}
                    </Typography>
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>

      <Button
        label="Log Session Weights"
        onPress={() => void handleSave()}
        loading={saving}
        fullWidth
        className="mt-4"
      />
    </View>
  );
}
