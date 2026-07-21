/**
 * Litter-size-adjusted growth benchmark.
 *
 * Bigger litters gain weight more slowly (more competition for milk/space), so
 * "expected weight for this age" is bucketed by litter size rather than a single
 * flat average across all litters.
 *
 * Bucket edges were chosen from the actual distribution of `litters.puppy_count`
 * for the 24 litters imported from DogBreederPro (sizes clustered ~8-20 puppies,
 * with very few litters below 6): small 1-5, medium 6-10, large 11+. This differs
 * from the naive 1-5 / 6-9 / 10+ split because that would leave "medium" almost
 * empty and dump most real litters into "large".
 */
export type LitterSizeBucket = 'small' | 'medium' | 'large';

/** Furthest age (in days) the benchmark curve tracks — beyond this, weighing has usually stopped. */
export const MAX_BENCHMARK_AGE_DAYS = 120;

/** Minimum number of historical data points required before a day's average is trusted. */
const MIN_SAMPLE_SIZE = 3;

export function litterSizeBucket(puppyCount: number): LitterSizeBucket {
  if (puppyCount <= 5) return 'small';
  if (puppyCount <= 10) return 'medium';
  return 'large';
}

export interface HistoricalWeightPoint {
  litterPuppyCount: number;
  ageDays: number;
  weightGrams: number;
}

export interface BenchmarkPoint {
  ageDays: number;
  avgGrams: number;
}

/**
 * Pure aggregation — no Supabase calls. Groups already-fetched historical weigh-ins
 * by integer age-in-days for the matching litter-size bucket, averaging grams per day.
 * Days with fewer than `MIN_SAMPLE_SIZE` data points are skipped as too noisy to show.
 */
export function computeBenchmarkCurve(
  historicalLogs: HistoricalWeightPoint[],
  bucket: LitterSizeBucket,
  maxAgeDays: number,
): BenchmarkPoint[] {
  const gramsByAgeDay = new Map<number, number[]>();

  for (const log of historicalLogs) {
    if (litterSizeBucket(log.litterPuppyCount) !== bucket) continue;
    if (log.ageDays < 0 || log.ageDays > maxAgeDays) continue;
    const arr = gramsByAgeDay.get(log.ageDays);
    if (arr) arr.push(log.weightGrams);
    else gramsByAgeDay.set(log.ageDays, [log.weightGrams]);
  }

  const curve: BenchmarkPoint[] = [];
  gramsByAgeDay.forEach((grams, ageDays) => {
    if (grams.length < MIN_SAMPLE_SIZE) return;
    const avgGrams = Math.round(grams.reduce((sum, g) => sum + g, 0) / grams.length);
    curve.push({ ageDays, avgGrams });
  });

  return curve.sort((a, b) => a.ageDays - b.ageDays);
}
