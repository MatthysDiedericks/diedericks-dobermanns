import { Path, Text as SvgText } from 'react-native-svg';

import type { BenchmarkPoint } from '@/lib/litters/growthBenchmark';

export interface AgeXAnchor {
  ageDays: number;
  x: number;
}

/**
 * Builds an ageDays→x interpolator from a set of known {ageDays, x} anchors
 * (e.g. one per plotted date). Ages outside the anchor range return `null` so
 * the benchmark line doesn't extrapolate beyond the plotted date range.
 */
export function buildAgeDaysToX(anchors: AgeXAnchor[]): (ageDays: number) => number | null {
  const sorted = [...anchors].sort((a, b) => a.ageDays - b.ageDays);
  return (ageDays: number) => {
    if (sorted.length === 0) return null;
    if (ageDays < sorted[0].ageDays || ageDays > sorted[sorted.length - 1].ageDays) return null;
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      if (ageDays < a.ageDays || ageDays > b.ageDays) continue;
      if (b.ageDays === a.ageDays) return a.x;
      const t = (ageDays - a.ageDays) / (b.ageDays - a.ageDays);
      return a.x + t * (b.x - a.x);
    }
    return sorted[sorted.length - 1].x;
  };
}

interface GrowthBenchmarkLineProps {
  benchmarkCurve: BenchmarkPoint[];
  /** Maps a benchmark point's ageDays to an x coordinate; return null to skip that point. */
  ageDaysToX: (ageDays: number) => number | null;
  yForGrams: (grams: number) => number;
  label?: string;
}

/** Dashed, muted background reference line — drawn behind the puppy/dog lines. */
export function GrowthBenchmarkLine({
  benchmarkCurve,
  ageDaysToX,
  yForGrams,
  label = 'Litter-size average',
}: GrowthBenchmarkLineProps) {
  if (benchmarkCurve.length === 0) return null;

  const points = benchmarkCurve
    .map((pt) => {
      const x = ageDaysToX(pt.ageDays);
      return x == null ? null : { x, y: yForGrams(pt.avgGrams) };
    })
    .filter((p): p is { x: number; y: number } => p != null);

  if (points.length < 2) return null;

  const pathD = points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ');
  const first = points[0];

  return (
    <>
      <Path
        d={pathD}
        stroke="rgba(196,163,90,0.35)"
        strokeWidth={2}
        strokeDasharray="6 3"
        fill="none"
      />
      <SvgText x={first.x + 4} y={first.y - 6} fill="rgba(196,163,90,0.7)" fontSize={8}>
        {label}
      </SvgText>
    </>
  );
}
