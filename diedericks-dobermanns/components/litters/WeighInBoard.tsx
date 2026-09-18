import { useMemo, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import {
  parseWeightInput,
  type LitterPuppy,
  type PuppyWeightLog,
} from '@/hooks/useLitterWeights';
import { CollarDot, collarLabel } from '@/lib/litters/collarColours';
import {
  defaultWeighInSession,
  isWeightConcern,
  latestPriorWeightKg,
  sessionsRecordedToday,
  weighDeltaGrams,
} from '@/lib/litters/guide';
import { puppyDidNotSurvive } from '@/lib/litters/outcomes';
import { formatKennelDate } from '@/lib/kennel/formatters';
import { showError, showSaved } from '@/lib/dogDetail/feedback';
import type { WeighingSession } from '@/lib/litters/weighingSchedule';

export function WeighInBoard({
  puppies,
  weightsByPuppyId,
  onBatchSave,
}: {
  puppies: LitterPuppy[];
  weightsByPuppyId: Map<string, PuppyWeightLog[]>;
  onBatchSave: (
    entries: { puppyId: string; weightKg: number }[],
    session: WeighingSession,
    recordedAt: Date,
  ) => Promise<void>;
}) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const alive = puppies.filter((p) => !puppyDidNotSurvive(p));
  const allLogs = useMemo(() => {
    const rows: PuppyWeightLog[] = [];
    weightsByPuppyId.forEach((logs) => rows.push(...logs));
    return rows;
  }, [weightsByPuppyId]);
  const recorded = sessionsRecordedToday(allLogs, today);
  const [session, setSession] = useState<WeighingSession>(() =>
    defaultWeighInSession(now, recorded),
  );
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [flags, setFlags] = useState<string[]>([]);

  async function handleSave() {
    const entries: { puppyId: string; weightKg: number }[] = [];
    for (const p of alive) {
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
    const concern: string[] = [];
    for (const e of entries) {
      const pup = alive.find((p) => p.id === e.puppyId);
      const prev = latestPriorWeightKg(
        weightsByPuppyId.get(e.puppyId) ?? [],
        today,
        session,
      );
      const delta = weighDeltaGrams(prev, e.weightKg);
      if (pup && isWeightConcern(delta)) {
        concern.push(
          delta === 0
            ? `${pup.name} gained nothing since the last weigh-in.`
            : `${pup.name} lost ${Math.abs(delta ?? 0)} g since the last weigh-in.`,
        );
      }
    }
    setSaving(true);
    try {
      await onBatchSave(entries, session, now);
      showSaved(concern.length ? concern.join('\n') : 'Weights saved.');
      setInputs({});
      setFlags(concern);
    } catch {
      showError();
    } finally {
      setSaving(false);
    }
  }

  if (!alive.length) {
    return (
      <Typography variant="caption">
        Record pups first, then weigh the litter in one sitting.
      </Typography>
    );
  }

  const dateLabel = formatKennelDate(today);

  return (
    <View className="mb-6">
      <Typography variant="label" className="mb-2">
        Weigh-in · {dateLabel}
      </Typography>
      <View className="mb-3 flex-row gap-2">
        {(['AM', 'PM'] as const).map((s) => (
          <Pressable
            key={s}
            onPress={() => setSession(s)}
            className={`min-h-12 flex-1 items-center justify-center rounded-full border ${
              session === s ? 'border-gold bg-gold/15' : 'border-gold/25'
            }`}
          >
            <Typography variant="subtitle">{s}</Typography>
          </Pressable>
        ))}
      </View>

      {flags.map((f) => (
        <Typography key={f} variant="caption" className="mb-1 text-amber-200">
          ⚠ {f}
        </Typography>
      ))}

      {alive.map((p) => {
        const prev = latestPriorWeightKg(
          weightsByPuppyId.get(p.id) ?? [],
          today,
          session,
        );
        const typed = parseWeightInput(inputs[p.id] ?? '');
        const delta = weighDeltaGrams(prev, typed);
        const concern = isWeightConcern(delta);
        return (
          <View
            key={p.id}
            className={`mb-2 flex-row items-center rounded-xl border px-3 py-2 ${
              concern ? 'border-amber-400/50 bg-amber-500/10' : 'border-gold/20'
            }`}
          >
            <CollarDot colour={p.collar_colour} size={12} />
            <View className="ml-2 min-w-0 flex-1">
              <Typography variant="caption" numberOfLines={1}>
                {p.name} {p.collar_colour ? collarLabel(p.collar_colour) : ''}
              </Typography>
              <Typography variant="caption" className="text-subtle">
                {prev != null ? `${Math.round(prev * 1000)} g` : '—'} →
              </Typography>
            </View>
            <TextInput
              value={inputs[p.id] ?? ''}
              onChangeText={(v) =>
                setInputs((s) => ({ ...s, [p.id]: v.replace(/[^\d]/g, '') }))
              }
              placeholder="g"
              keyboardType="number-pad"
              placeholderTextColor="#8C8474"
              className="h-12 w-20 rounded-lg border border-gold/30 bg-black-rich px-2 text-center font-body text-base text-ink"
            />
            <Typography
              variant="caption"
              className={`ml-2 w-14 text-right ${concern ? 'text-amber-200' : ''}`}
            >
              {delta == null
                ? ''
                : delta > 0
                  ? `▲ +${delta}`
                  : delta < 0
                    ? `▼ ${delta}`
                    : '0'}
              {concern ? ' ⚠' : ''}
            </Typography>
          </View>
        );
      })}

      <Button
        label={saving ? 'Saving…' : 'Save all'}
        onPress={() => void handleSave()}
        loading={saving}
        fullWidth
        className="mt-2"
      />
    </View>
  );
}
