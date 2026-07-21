import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Fragment, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { EmptyTabState } from '@/components/dogs/detail/EmptyTabState';
import { buildAgeDaysToX, GrowthBenchmarkLine } from '@/components/litters/GrowthBenchmarkLine';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import type { LitterPuppy, PuppyWeightLog } from '@/hooks/useLitterWeights';
import { collarHex } from '@/lib/litters/collarColours';
import type { BenchmarkPoint } from '@/lib/litters/growthBenchmark';
import { formatWeightGrams, getAgeDays } from '@/lib/litters/weighingSchedule';

const CHART_HEIGHT = 300;
const PADDING = { top: 20, right: 12, bottom: 44, left: 40 };

interface PuppyGrowthChartProps {
  puppies: LitterPuppy[];
  weightsByPuppyId: Map<string, PuppyWeightLog[]>;
  uniqueDates: string[];
  whelpDate?: string | null;
  benchmarkCurve?: BenchmarkPoint[];
}

function shortDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch {
    return iso;
  }
}

export function PuppyGrowthChart({
  puppies,
  weightsByPuppyId,
  uniqueDates,
  whelpDate,
  benchmarkCurve,
}: PuppyGrowthChartProps) {
  const [isolatedId, setIsolatedId] = useState<string | null>(null);
  const hasAny = puppies.some((p) => (weightsByPuppyId.get(p.id)?.length ?? 0) > 0);
  const width = 340;
  const innerW = width - PADDING.left - PADDING.right;
  const innerH = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  const { minG, maxG, day14X } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    weightsByPuppyId.forEach((logs) =>
      logs.forEach((l) => {
        const g = l.weight_kg * 1000;
        min = Math.min(min, g);
        max = Math.max(max, g);
      }),
    );
    if (!Number.isFinite(min)) {
      min = 0;
      max = 1000;
    }
    let d14x: number | null = null;
    if (whelpDate && uniqueDates.length > 1) {
      const idx = uniqueDates.findIndex((d) => getAgeDays(whelpDate, new Date(d)) >= 14);
      if (idx >= 0) d14x = PADDING.left + (idx / (uniqueDates.length - 1)) * innerW;
    }
    return { minG: min, maxG: max, day14X: d14x };
  }, [weightsByPuppyId, uniqueDates, whelpDate, innerW]);

  if (!hasAny) return <EmptyTabState message="No weights recorded yet." />;

  const range = maxG - minG || 100;
  const pad = range * 0.1;
  const xForDate = (date: string) => {
    const idx = uniqueDates.indexOf(date);
    if (uniqueDates.length <= 1) return PADDING.left + innerW / 2;
    return PADDING.left + (idx / (uniqueDates.length - 1)) * innerW;
  };
  const yForGrams = (g: number) =>
    PADDING.top + innerH - ((g - minG + pad) / (range + pad * 2)) * innerH;
  const ageDaysToX = whelpDate
    ? buildAgeDaysToX(
        uniqueDates.map((d) => ({ ageDays: getAgeDays(whelpDate, new Date(d)), x: xForDate(d) })),
      )
    : () => null;
  const hasBenchmark = !!benchmarkCurve && benchmarkCurve.length > 0;

  async function exportPdf() {
    const rows = puppies
      .map((p) => {
        const logs = weightsByPuppyId.get(p.id) ?? [];
        return `<tr><td>${p.name}</td><td>${logs.map((l) => `${l.recorded_date}: ${formatWeightGrams(l.weight_kg)}`).join('<br/>')}</td></tr>`;
      })
      .join('');
    const html = `<html><body style="background:#111008;color:#F5F0E8;font-family:serif;padding:20px">
      <h1 style="color:#C4A35A">Puppy Growth Chart</h1>
      <table border="1" cellpadding="6" style="border-color:#C4A35A;width:100%">${rows}</table>
    </body></html>`;
    const file = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(file.uri);
  }

  return (
    <View className="mt-4">
      <View className="mb-2 flex-row items-center justify-between">
        <Typography variant="label" className="text-gold">
          GROWTH CHART
        </Typography>
        <Button label="PDF" size="sm" variant="outline" onPress={() => void exportPdf()} />
      </View>
      <Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 ${width} ${CHART_HEIGHT}`}>
        <Line
          x1={PADDING.left}
          y1={PADDING.top + innerH}
          x2={width - PADDING.right}
          y2={PADDING.top + innerH}
          stroke="rgba(196,163,90,0.3)"
          strokeWidth={1}
        />
        {benchmarkCurve ? (
          <GrowthBenchmarkLine
            benchmarkCurve={benchmarkCurve}
            ageDaysToX={ageDaysToX}
            yForGrams={yForGrams}
          />
        ) : null}
        {day14X != null ? (
          <>
            <Line
              x1={day14X}
              y1={PADDING.top}
              x2={day14X}
              y2={PADDING.top + innerH}
              stroke="#C4A35A"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <SvgText x={day14X + 4} y={PADDING.top + 12} fill="#C4A35A" fontSize={9}>
              Daily →
            </SvgText>
          </>
        ) : null}
        {uniqueDates.map((d, i) =>
          i % Math.max(1, Math.floor(uniqueDates.length / 5)) === 0 ? (
            <Fragment key={d}>
              <SvgText
                x={xForDate(d)}
                y={CHART_HEIGHT - 22}
                fill="#8C8474"
                fontSize={8}
                textAnchor="middle"
              >
                {shortDate(d)}
              </SvgText>
              {whelpDate ? (
                <SvgText
                  x={xForDate(d)}
                  y={CHART_HEIGHT - 8}
                  fill="#6b7280"
                  fontSize={7}
                  textAnchor="middle"
                >
                  {getAgeDays(whelpDate, new Date(d))}d
                </SvgText>
              ) : null}
            </Fragment>
          ) : null,
        )}
        {puppies.map((p) => {
          const logs = weightsByPuppyId.get(p.id) ?? [];
          if (logs.length === 0) return null;
          const faded = isolatedId && isolatedId !== p.id;
          const color = collarHex(p.collar_colour);
          const opacity = faded ? 0.2 : 1;
          const points = logs.map((l) => ({
            x: xForDate(l.recorded_date),
            y: yForGrams(l.weight_kg * 1000),
          }));
          const pathD =
            points.length >= 2
              ? points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ')
              : '';
          return (
            <Fragment key={p.id}>
              {pathD ? (
                <Path d={pathD} stroke={color} strokeWidth={2} fill="none" opacity={opacity} />
              ) : null}
              {points.map((pt, i) => (
                <Circle key={`${p.id}-${i}`} cx={pt.x} cy={pt.y} r={4} fill={color} opacity={opacity} />
              ))}
            </Fragment>
          );
        })}
      </Svg>
      <View className="mt-2 flex-row flex-wrap gap-3">
        {hasBenchmark ? (
          <View className="flex-row items-center gap-1 rounded-full border border-gold/10 px-2 py-1">
            <Svg width={14} height={10}>
              <Line
                x1={0}
                y1={5}
                x2={14}
                y2={5}
                stroke="#C4A35A"
                strokeWidth={2}
                strokeDasharray="4 2"
              />
            </Svg>
            <Typography variant="caption" className="text-subtle">
              Benchmark
            </Typography>
          </View>
        ) : null}
        {puppies.map((p) => {
          const logs = weightsByPuppyId.get(p.id) ?? [];
          if (logs.length === 0) return null;
          const active = isolatedId === p.id;
          return (
            <Pressable
              key={p.id}
              onPress={() => setIsolatedId(active ? null : p.id)}
              className={`flex-row items-center gap-1 rounded-full border px-2 py-1 ${active ? 'border-gold bg-gold/15' : 'border-gold/20'}`}
            >
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: collarHex(p.collar_colour),
                }}
              />
              <Typography variant="caption">{p.name}</Typography>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
