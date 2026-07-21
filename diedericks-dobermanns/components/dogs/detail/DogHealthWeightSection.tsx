import { Alert, FlatList, Pressable, TextInput, View } from 'react-native';
import { useEffect, useState } from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

import { AccordionSection } from '@/components/dogs/detail/AccordionSection';
import { EmptyTabState } from '@/components/dogs/detail/EmptyTabState';
import { GrowthBenchmarkLine } from '@/components/litters/GrowthBenchmarkLine';
import { useWeightLogs } from '@/hooks/useDogDetail';
import { useGrowthBenchmark } from '@/hooks/useGrowthBenchmark';
import { parseDateInput, showError } from '@/lib/dogDetail/feedback';
import { formatKennelDate, formatWeight } from '@/lib/kennel/formatters';
import { parseWeightInput } from '@/hooks/useLitterWeights';
import { MAX_BENCHMARK_AGE_DAYS, type BenchmarkPoint } from '@/lib/litters/growthBenchmark';
import { getAgeDays } from '@/lib/litters/weighingSchedule';
import { requireSupabase } from '@/lib/supabase';
import { Typography } from '@/components/ui/Typography';
import type { Dog, WeightLog } from '@/types/app.types';

const CHART_WIDTH = 300;
const CHART_HEIGHT = 140;
const CHART_PAD = { top: 10, right: 10, bottom: 10, left: 10 };

function confirmDelete(label: string, onDelete: () => void) {
  Alert.alert(`Delete ${label}?`, 'This cannot be undone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onDelete },
  ]);
}

/** Single puppy's weight line against the litter-size benchmark, x-axis by age in days. */
function GrowthMiniChart({
  logs,
  whelpDate,
  benchmarkCurve,
}: {
  logs: WeightLog[];
  whelpDate: string;
  benchmarkCurve: BenchmarkPoint[];
}) {
  const ascending = [...logs].sort((a, b) => a.recorded_date.localeCompare(b.recorded_date));
  const grams = ascending.map((l) => Number(l.weight_kg) * 1000);
  const minG = Math.min(...grams);
  const maxG = Math.max(...grams);
  const range = maxG - minG || 100;
  const pad = range * 0.15;
  const innerW = CHART_WIDTH - CHART_PAD.left - CHART_PAD.right;
  const innerH = CHART_HEIGHT - CHART_PAD.top - CHART_PAD.bottom;
  const lastAge = getAgeDays(whelpDate, new Date(ascending[ascending.length - 1].recorded_date));
  const maxAge = Math.max(MAX_BENCHMARK_AGE_DAYS, lastAge);

  const xForAge = (age: number) => CHART_PAD.left + (age / maxAge) * innerW;
  const yForGrams = (g: number) =>
    CHART_PAD.top + innerH - ((g - minG + pad) / (range + pad * 2)) * innerH;

  const points = ascending.map((l) => ({
    x: xForAge(getAgeDays(whelpDate, new Date(l.recorded_date))),
    y: yForGrams(Number(l.weight_kg) * 1000),
  }));
  const pathD =
    points.length >= 2 ? points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') : '';

  return (
    <Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}>
      <GrowthBenchmarkLine
        benchmarkCurve={benchmarkCurve}
        ageDaysToX={(age) => (age >= 0 && age <= maxAge ? xForAge(age) : null)}
        yForGrams={yForGrams}
      />
      {pathD ? <Path d={pathD} stroke="#C4A35A" strokeWidth={2} fill="none" /> : null}
      {points.map((p, i) => (
        <Circle key={i} cx={p.x} cy={p.y} r={3} fill="#C4A35A" />
      ))}
    </Svg>
  );
}

export function DogHealthWeightSection({ dogId, dog }: { dogId: string; dog?: Dog }) {
  const weights = useWeightLogs(dogId);
  const [weightKg, setWeightKg] = useState('');
  const [weightDate, setWeightDate] = useState(new Date().toISOString().slice(0, 10));
  const [weightSaving, setWeightSaving] = useState(false);
  const [litterInfo, setLitterInfo] = useState<{ actualDate: string | null; puppyCount: number | null } | null>(
    null,
  );
  const recentWeights = weights.logs.slice(0, 10);
  const latest = weights.logs[0];

  useEffect(() => {
    if (!dog?.litter_id) {
      setLitterInfo(null);
      return;
    }
    let cancelled = false;
    requireSupabase()
      .from('litters')
      .select('actual_date, puppy_count')
      .eq('id', dog.litter_id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setLitterInfo(
          data ? { actualDate: data.actual_date ?? null, puppyCount: data.puppy_count ?? null } : null,
        );
      });
    return () => {
      cancelled = true;
    };
  }, [dog?.litter_id]);

  const { benchmarkCurve } = useGrowthBenchmark(litterInfo?.puppyCount ?? 1);
  const showChart = !!litterInfo?.actualDate && weights.logs.length > 0;

  async function logWeight() {
    const kg = parseWeightInput(weightKg);
    const date = parseDateInput(weightDate);
    if (kg == null || !date) {
      showError('Enter a valid weight and date.');
      return;
    }
    setWeightSaving(true);
    try {
      await weights.addWeight(kg, date);
      setWeightKg('');
    } finally {
      setWeightSaving(false);
    }
  }

  return (
    <AccordionSection title="Weight log" count={recentWeights.length}>
      {latest ? (
        <Typography variant="subtitle" className="mb-3 text-gold">
          Latest: {formatWeight(Number(latest.weight_kg))} ({formatKennelDate(latest.recorded_date)})
        </Typography>
      ) : null}
      {showChart ? (
        <View className="mb-3">
          <GrowthMiniChart
            logs={weights.logs}
            whelpDate={litterInfo!.actualDate!}
            benchmarkCurve={benchmarkCurve}
          />
          {benchmarkCurve.length === 0 ? null : (
            <Typography variant="caption" className="mt-1 text-subtle">
              Dashed line: litter-size average for comparison.
            </Typography>
          )}
        </View>
      ) : null}
      <View className="mb-3 gap-2 rounded-xl border border-gold/20 bg-black-rich p-3">
        <TextInput
          value={weightDate}
          onChangeText={setWeightDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#8C8474"
          className="rounded-lg border border-gold/20 px-3 py-2 font-body text-ink"
        />
        <TextInput
          value={weightKg}
          onChangeText={setWeightKg}
          placeholder="kg (e.g. 1.250)"
          keyboardType="decimal-pad"
          placeholderTextColor="#8C8474"
          className="rounded-lg border border-gold/20 px-3 py-2 font-body text-ink"
        />
        <Pressable
          onPress={() => void logWeight()}
          disabled={weightSaving}
          className="rounded-lg bg-gold py-2"
        >
          <Typography variant="label" className="text-center text-black-rich">
            {weightSaving ? 'Saving…' : 'Log Weight'}
          </Typography>
        </Pressable>
      </View>
      {recentWeights.length === 0 ? (
        <EmptyTabState message="No weights logged yet." />
      ) : (
        <FlatList
          data={recentWeights}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <Pressable
              onLongPress={() =>
                confirmDelete('weight entry', () => void weights.deleteWeight(item.id))
              }
              className="mb-1 flex-row justify-between border-b border-gold/10 py-2"
            >
              <Typography variant="caption">{formatKennelDate(item.recorded_date)}</Typography>
              <Typography variant="body">{formatWeight(Number(item.weight_kg))}</Typography>
            </Pressable>
          )}
        />
      )}
    </AccordionSection>
  );
}
