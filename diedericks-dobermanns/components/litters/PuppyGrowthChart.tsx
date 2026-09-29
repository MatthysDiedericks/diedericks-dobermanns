import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Fragment, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';

import { EmptyTabState } from '@/components/dogs/detail/EmptyTabState';
import { buildAgeDaysToX, GrowthBenchmarkLine } from '@/components/litters/GrowthBenchmarkLine';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import type { LitterPuppy, PuppyWeightLog } from '@/hooks/useLitterWeights';
import { collarHex } from '@/lib/litters/collarColours';
import type { BenchmarkPoint } from '@/lib/litters/growthBenchmark';
import { formatWeightGrams, getAgeDays } from '@/lib/litters/weighingSchedule';
import {
  formatWeighDate,
  readingsChronological,
  type WeightReading,
} from '@/lib/litters/weightRounds';

const CHART_HEIGHT = 300;
const PADDING = { top: 20, right: 12, bottom: 44, left: 40 };

interface PuppyGrowthChartProps {
  puppies: LitterPuppy[];
  weightsByPuppyId: Map<string, PuppyWeightLog[]>;
  uniqueDates: string[];
  whelpDate?: string | null;
  benchmarkCurve?: BenchmarkPoint[];
}

function readingMs(log: { recorded_at?: string | null; recorded_date: string }): number {
  const raw = log.recorded_at ?? `${log.recorded_date}T12:00:00`;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? 0 : t;
}

export function PuppyGrowthChart({
  puppies,
  weightsByPuppyId,
  whelpDate,
  benchmarkCurve,
}: PuppyGrowthChartProps) {
  const [isolatedId, setIsolatedId] = useState<string | null>(null);
  const width = 340;
  const innerW = width - PADDING.left - PADDING.right;
  const innerH = CHART_HEIGHT - PADDING.top - PADDING.bottom;

  const series = useMemo(
    () =>
      puppies
        .map((p) => {
          const logs = readingsChronological(weightsByPuppyId.get(p.id) ?? []);
          const birth: WeightReading[] =
            whelpDate && p.birth_weight_grams != null && p.birth_weight_grams > 0
              ? [
                  {
                    weight_kg: p.birth_weight_grams / 1000,
                    recorded_date: whelpDate.slice(0, 10),
                    recorded_at: `${whelpDate.slice(0, 10)}T${(p.birth_time ?? '00:00').slice(0, 5)}:00`,
                  },
                ]
              : [];
          return { puppy: p, logs: readingsChronological([...birth, ...logs]) };
        })
        .filter((s) => s.logs.length > 0),
    [puppies, weightsByPuppyId, whelpDate],
  );

  const { minG, maxG, minT, maxT, dayTicks } = useMemo(() => {
    const times = series.flatMap((s) => s.logs.map((l) => readingMs(l)));
    const grams = series.flatMap((s) => s.logs.map((l) => Number(l.weight_kg) * 1000));
    const min = grams.length ? Math.min(...grams) : 0;
    const max = grams.length ? Math.max(...grams) : 1000;
    const t0 = times.length ? Math.min(...times) : 0;
    const t1 = times.length ? Math.max(...times) : 1;
    const ticks = [
      ...new Set(series.flatMap((s) => s.logs.map((l) => l.recorded_date.slice(0, 10)))),
    ]
      .sort()
      .map((day) => ({ day, t: new Date(`${day}T12:00:00`).getTime() }))
      .filter(({ t }) => t >= t0 && t <= t1);
    return { minG: min, maxG: max, minT: t0, maxT: t1, dayTicks: ticks };
  }, [series]);

  if (series.length === 0) return <EmptyTabState message="No weights recorded yet." />;

  const range = maxG - minG || 100;
  const pad = range * 0.1;
  const spanT = maxT - minT || 1;
  const xForTime = (t: number) => PADDING.left + ((t - minT) / spanT) * innerW;
  const yForGrams = (g: number) =>
    PADDING.top + innerH - ((g - minG + pad) / (range + pad * 2)) * innerH;
  const day14X = (() => {
    if (!whelpDate) return null;
    const born = new Date(`${whelpDate.slice(0, 10)}T12:00:00`);
    const at = new Date(born);
    at.setDate(at.getDate() + 14);
    const t = at.getTime();
    if (t < minT || t > maxT) return null;
    return xForTime(t);
  })();
  const ageDaysToX = whelpDate
    ? buildAgeDaysToX(
        series.flatMap((s) =>
          s.logs.map((l) => ({
            ageDays: getAgeDays(whelpDate, new Date(l.recorded_date.slice(0, 10))),
            x: xForTime(readingMs(l)),
          })),
        ),
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
        <SvgText x={4} y={yForGrams(maxG) + 3} fill="rgba(255,255,255,0.55)" fontSize={9}>
          {Math.round(maxG)} g
        </SvgText>
        <SvgText x={4} y={yForGrams(minG) + 3} fill="rgba(255,255,255,0.55)" fontSize={9}>
          {Math.round(minG)} g
        </SvgText>
        {dayTicks.map(({ day, t }, i) =>
          i % Math.max(1, Math.floor(dayTicks.length / 5)) === 0 ? (
            <Fragment key={day}>
              <Line
                x1={xForTime(t)}
                y1={PADDING.top}
                x2={xForTime(t)}
                y2={PADDING.top + innerH}
                stroke="rgba(196,163,90,0.12)"
                strokeWidth={1}
              />
              <SvgText
                x={xForTime(t)}
                y={CHART_HEIGHT - 22}
                fill="#8C8474"
                fontSize={8}
                textAnchor="middle"
              >
                {formatWeighDate(day)}
              </SvgText>
              {whelpDate ? (
                <SvgText
                  x={xForTime(t)}
                  y={CHART_HEIGHT - 8}
                  fill="#6b7280"
                  fontSize={7}
                  textAnchor="middle"
                >
                  {getAgeDays(whelpDate, new Date(day))}d
                </SvgText>
              ) : null}
            </Fragment>
          ) : null,
        )}
        {series.map(({ puppy: p, logs }) => {
          if (logs.length === 0) return null;
          const faded = isolatedId && isolatedId !== p.id;
          const color = collarHex(p.collar_colour);
          const opacity = faded ? 0.2 : 1;
          const points = logs.map((l) => ({
            x: xForTime(readingMs(l)),
            y: yForGrams(Number(l.weight_kg) * 1000),
            grams: Number(l.weight_kg) * 1000,
          }));
          return (
            <Fragment key={p.id}>
              {points.slice(0, -1).map((pt, i) => {
                const next = points[i + 1];
                const flatOrDown = next.grams <= pt.grams;
                return (
                  <Line
                    key={`${p.id}-seg-${i}`}
                    x1={pt.x}
                    y1={pt.y}
                    x2={next.x}
                    y2={next.y}
                    stroke={flatOrDown ? '#f59e0b' : color}
                    strokeWidth={flatOrDown ? 3 : 2}
                    opacity={opacity}
                  />
                );
              })}
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
        {series.map(({ puppy: p, logs }) => {
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
