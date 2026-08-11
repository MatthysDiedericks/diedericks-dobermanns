import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { ProgesteroneChart } from '@/components/heats/ProgesteroneChart';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { useProgesterone } from '@/hooks/useProgesterone';
import type { HeatCycleRecord, ProgesteroneTest } from '@/lib/heats/constants';
import {
  formatConversion,
  interpretNgMl,
  toNgMl,
  type ProgUnit,
} from '@/lib/heats/progesterone';
import { formatKennelDate } from '@/lib/kennel/formatters';

export function ProgesteroneEntry({
  cycle,
  dogId,
  onChanged,
}: {
  cycle: HeatCycleRecord;
  dogId: string;
  onChanged: () => void;
}) {
  const { tests, loading, error, addReading, defaultUnit } = useProgesterone(
    cycle.id,
    dogId,
  );
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState<ProgUnit>(defaultUnit);
  const [phase, setPhase] = useState<'ovulation_timing' | 'reverse'>('ovulation_timing');
  const [lab, setLab] = useState('');
  const [saving, setSaving] = useState(false);
  const [shiftMsg, setShiftMsg] = useState<string | null>(null);

  const numeric = Number(value);
  const ngMl = Number.isFinite(numeric) ? toNgMl(numeric, unit) : NaN;
  const conversion = formatConversion(numeric, unit);
  const interpretation = Number.isFinite(ngMl) ? interpretNgMl(ngMl) : null;

  const ovulationTests: ProgesteroneTest[] = tests
    .filter((t) => t.test_phase === 'ovulation_timing')
    .map((t) => ({
      date: t.tested_at.slice(0, 10),
      value_ng_ml: Number(t.value_ng_ml),
      lab: t.lab,
      notes: t.notes,
    }));
  const reverseTests = tests.filter((t) => t.test_phase === 'reverse');

  const save = async () => {
    setSaving(true);
    setShiftMsg(null);
    try {
      const result = await addReading({
        tested_at: new Date().toISOString(),
        value: numeric,
        unit,
        test_phase: phase,
        lab,
      });
      if (result.whelpShiftDays != null) {
        setShiftMsg(
          result.whelpShiftDays === 0
            ? 'Whelp window unchanged.'
            : `Whelp window moved ${Math.abs(result.whelpShiftDays)} day(s) ${
                result.whelpShiftDays > 0 ? 'later' : 'earlier'
              }.`,
        );
      }
      setValue('');
      setLab('');
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="mb-4">
      <Typography variant="subtitle" className="mb-3 text-gold">
        Progesterone
      </Typography>
      {loading ? (
        <Typography variant="caption" className="text-muted">
          Loading…
        </Typography>
      ) : null}
      {error ? (
        <Typography variant="caption" className="text-danger">
          {error}
        </Typography>
      ) : null}

      <ProgesteroneChart tests={ovulationTests} />

      {reverseTests.length > 0 ? (
        <View className="mt-3">
          <Typography variant="caption" className="mb-2 text-muted">
            Reverse tests (not on chart)
          </Typography>
          {reverseTests.map((t) => (
            <View key={t.id} className="flex-row justify-between border-b border-gold/10 py-2">
              <Typography variant="caption">{formatKennelDate(t.tested_at)}</Typography>
              <Typography variant="body">{Number(t.value_ng_ml)} ng/mL</Typography>
            </View>
          ))}
        </View>
      ) : null}

      <View className="mt-4 flex-row gap-2">
        <TextInput
          value={value}
          onChangeText={setValue}
          keyboardType="decimal-pad"
          placeholder="Value"
          placeholderTextColor="#8C8474"
          className="flex-1 rounded-xl border border-gold/20 bg-[#111008] px-4 py-3 font-body text-ink"
        />
        <Pressable
          onPress={() => setUnit(unit === 'ng_ml' ? 'nmol_l' : 'ng_ml')}
          className="justify-center rounded-xl border border-gold/30 px-3"
        >
          <Typography variant="caption" className="text-gold">
            {unit === 'ng_ml' ? 'ng/mL' : 'nmol/L'}
          </Typography>
        </Pressable>
      </View>
      {conversion ? (
        <Typography variant="caption" className="mt-1 text-gold">
          {conversion}
        </Typography>
      ) : null}
      {interpretation ? (
        <Typography variant="caption" className="mt-1 text-muted">
          {interpretation}
        </Typography>
      ) : null}

      <View className="my-3 flex-row gap-2">
        {(
          [
            ['ovulation_timing', 'Ovulation'],
            ['reverse', 'Reverse'],
          ] as const
        ).map(([v, label]) => (
          <Pressable
            key={v}
            onPress={() => setPhase(v)}
            className={`rounded-full border px-3 py-1.5 ${
              phase === v ? 'border-gold bg-gold/15' : 'border-gold/20'
            }`}
          >
            <Typography variant="caption">{label}</Typography>
          </Pressable>
        ))}
      </View>

      <TextInput
        value={lab}
        onChangeText={setLab}
        placeholder="Lab"
        placeholderTextColor="#8C8474"
        className="mb-3 rounded-xl border border-gold/20 bg-[#111008] px-4 py-3 font-body text-ink"
      />
      {shiftMsg ? (
        <Typography variant="caption" className="mb-2 text-gold">
          {shiftMsg}
        </Typography>
      ) : null}
      <Button label="Add reading" onPress={() => void save()} loading={saving} fullWidth />
    </View>
  );
}
