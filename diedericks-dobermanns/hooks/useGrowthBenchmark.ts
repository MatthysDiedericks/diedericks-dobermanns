import { useEffect, useMemo, useState } from 'react';

import {
  computeBenchmarkCurve,
  litterSizeBucket,
  MAX_BENCHMARK_AGE_DAYS,
  type BenchmarkPoint,
  type HistoricalWeightPoint,
  type LitterSizeBucket,
} from '@/lib/litters/growthBenchmark';
import { getAgeDays } from '@/lib/litters/weighingSchedule';
import { requireSupabase, supabase } from '@/lib/supabase';

const SELECT =
  'weight_kg, recorded_date, dogs!inner(litter_id, litters!inner(actual_date, puppy_count))' as const;

interface RawWeightRow {
  weight_kg: number;
  recorded_date: string;
  dogs: {
    litter_id: string | null;
    litters: { actual_date: string | null; puppy_count: number | null } | null;
  } | null;
}

/**
 * The historical dataset (all weigh-ins across all litters) is the same regardless
 * of which bucket a given litter falls into, so it's fetched once and cached at
 * module scope — switching between any litters (same bucket or not) never re-fetches.
 */
let cachedPoints: HistoricalWeightPoint[] | null = null;
let inFlight: Promise<HistoricalWeightPoint[]> | null = null;

async function fetchHistoricalPoints(): Promise<HistoricalWeightPoint[]> {
  if (cachedPoints) return cachedPoints;
  if (!supabase) return [];
  if (!inFlight) {
    inFlight = (async () => {
      const client = requireSupabase();
      const { data, error } = await client.from('weight_logs').select(SELECT);
      if (error) throw new Error(error.message);

      const points: HistoricalWeightPoint[] = [];
      for (const row of (data ?? []) as unknown as RawWeightRow[]) {
        const litter = row.dogs?.litters;
        if (!litter?.actual_date || !litter.puppy_count) continue;
        points.push({
          litterPuppyCount: litter.puppy_count,
          ageDays: getAgeDays(litter.actual_date, new Date(row.recorded_date)),
          weightGrams: Math.round(row.weight_kg * 1000),
        });
      }
      cachedPoints = points;
      return points;
    })();
  }
  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}

/** Litter-size-adjusted "expected weight for this age" reference curve. */
export function useGrowthBenchmark(litterPuppyCount: number) {
  const [points, setPoints] = useState<HistoricalWeightPoint[] | null>(cachedPoints);
  const [loading, setLoading] = useState(!cachedPoints);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cachedPoints) {
      setPoints(cachedPoints);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchHistoricalPoints()
      .then((pts) => {
        if (cancelled) return;
        setPoints(pts);
        setError(null);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load benchmark data');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const bucket: LitterSizeBucket = litterSizeBucket(litterPuppyCount);

  const benchmarkCurve: BenchmarkPoint[] = useMemo(() => {
    if (!points || points.length === 0) return [];
    return computeBenchmarkCurve(points, bucket, MAX_BENCHMARK_AGE_DAYS);
  }, [points, bucket]);

  return { benchmarkCurve, bucket, loading, error };
}
