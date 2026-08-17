import { addMonths, differenceInDays, differenceInMonths, format, parseISO } from 'date-fns';

import type { BreedHeatDefaults, HeatCycleRecord } from '@/lib/heats/constants';
import { addDays, daysSince, daysUntil, isActiveHeat } from '@/lib/heats/calculations';
import { goHomeWindow, whelpWindow } from '@/lib/dogs/whelpDates';

export const SUPERSEDE_WINDOW_DAYS = 45;
export const FIRST_SEASON_MIN_MONTHS = 6;
export const FIRST_SEASON_MAX_MONTHS = 12;

export type ForecastSource =
  | 'breed_default'
  | 'one_cycle'
  | 'last_three'
  | 'first_season';

export interface HeatForecast {
  expectedStart: string;
  rangeEarliest: string;
  rangeLatest: string;
  rangeLabel: string;
  basisLabel: string;
  lengthDays: number;
  source: ForecastSource;
}

function startsOfActual(cycles: HeatCycleRecord[]): string[] {
  return cycles
    .filter((c) => !c.is_predicted)
    .map((c) => c.heat_start_date)
    .sort((a, b) => a.localeCompare(b));
}

export function intervalsFromStarts(starts: string[]): number[] {
  const gaps: number[] = [];
  for (let i = 1; i < starts.length; i++) {
    gaps.push(differenceInDays(parseISO(starts[i]), parseISO(starts[i - 1])));
  }
  return gaps;
}

export function formatDayRange(earliest: string, latest: string): string {
  const a = parseISO(earliest);
  const b = parseISO(latest);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return '—';
  if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) {
    return `${format(a, 'd')}–${format(b, 'd MMM yyyy')}`;
  }
  if (a.getFullYear() === b.getFullYear()) {
    return `${format(a, 'd MMM')} – ${format(b, 'd MMM yyyy')}`;
  }
  return `${format(a, 'd MMM yyyy')} – ${format(b, 'd MMM yyyy')}`;
}

export function ageInMonths(dob: string | null | undefined, now = new Date()): number | null {
  if (!dob) return null;
  try {
    return Math.max(0, differenceInMonths(now, parseISO(dob)));
  } catch {
    return null;
  }
}

function isoDay(d: Date): string {
  return format(d, 'yyyy-MM-dd');
}

export function firstSeasonForecast(dob: string): HeatForecast {
  const earliest = isoDay(addMonths(parseISO(dob), FIRST_SEASON_MIN_MONTHS));
  const latest = isoDay(addMonths(parseISO(dob), FIRST_SEASON_MAX_MONTHS));
  return {
    expectedStart: earliest,
    rangeEarliest: earliest,
    rangeLatest: latest,
    rangeLabel: `Expected ${formatDayRange(earliest, latest)}`,
    basisLabel: 'typical first season — 6–12 months of age',
    lengthDays: 0,
    source: 'first_season',
  };
}

export function forecastFromHistory(
  cycles: HeatCycleRecord[],
  defaults: Pick<BreedHeatDefaults, 'avg_cycle_days' | 'min_cycle_days' | 'max_cycle_days'>,
  dob?: string | null,
): HeatForecast | null {
  const starts = startsOfActual(cycles);
  const minD = defaults.min_cycle_days ?? 150;
  const maxD = defaults.max_cycle_days ?? 210;
  const avgD = defaults.avg_cycle_days ?? 180;

  if (starts.length === 0) {
    const months = ageInMonths(dob ?? null);
    if (dob && months != null && months < FIRST_SEASON_MAX_MONTHS) {
      return firstSeasonForecast(dob);
    }
    return null;
  }

  const last = starts[starts.length - 1];
  const gaps = intervalsFromStarts(starts);
  let lengthDays = avgD;
  let minLen = minD;
  let maxLen = maxD;
  let source: ForecastSource = 'breed_default';
  let basisLabel = 'breed average — no history yet';

  if (gaps.length === 1) {
    lengthDays = gaps[0];
    source = 'one_cycle';
    basisLabel = 'based on 1 previous cycle';
  } else if (gaps.length >= 2) {
    const last3 = gaps.slice(-3);
    lengthDays = Math.round(last3.reduce((a, b) => a + b, 0) / last3.length);
    minLen = Math.min(...last3);
    maxLen = Math.max(...last3);
    source = 'last_three';
    basisLabel = `based on her last ${last3.length} cycles (avg ${lengthDays} days)`;
  }

  const expectedStart = addDays(last, lengthDays);
  const rangeEarliest = addDays(last, minLen);
  const rangeLatest = addDays(last, maxLen);
  return {
    expectedStart,
    rangeEarliest,
    rangeLatest,
    rangeLabel: `Expected ${formatDayRange(rangeEarliest, rangeLatest)}`,
    basisLabel,
    lengthDays,
    source,
  };
}

export function findPredictedWithinWindow(
  cycles: HeatCycleRecord[],
  actualStart: string,
  windowDays = SUPERSEDE_WINDOW_DAYS,
): HeatCycleRecord | null {
  const scored = cycles
    .filter((c) => c.is_predicted)
    .map((c) => ({
      c,
      delta: Math.abs(differenceInDays(parseISO(actualStart), parseISO(c.heat_start_date))),
    }))
    .filter((x) => x.delta <= windowDays)
    .sort((a, b) => a.delta - b.delta);
  return scored[0]?.c ?? null;
}

export function forecastVsActualMessage(
  predictedStart: string | null | undefined,
  actualStart: string,
): string | null {
  if (!predictedStart) return null;
  const days = differenceInDays(parseISO(actualStart), parseISO(predictedStart));
  if (days === 0) return null;
  if (days < 0) {
    return `Came into season ${Math.abs(days)} days earlier than forecast — forecast updated.`;
  }
  return `Came into season ${days} days later than forecast — forecast updated.`;
}

export function offsetMessageFromDays(offsetDays: number | null | undefined): string | null {
  if (offsetDays == null || offsetDays === 0) return null;
  if (offsetDays < 0) {
    return `Came into season ${Math.abs(offsetDays)} days earlier than forecast — forecast updated.`;
  }
  return `Came into season ${offsetDays} days later than forecast — forecast updated.`;
}

export function isPregnantCycle(cycle: HeatCycleRecord | null | undefined): boolean {
  if (!cycle || cycle.is_predicted) return false;
  return cycle.pregnancy_status === 'pregnant' || cycle.status === 'confirmed_pregnant';
}

export function intervalBefore(cycle: HeatCycleRecord, cycles: HeatCycleRecord[]): number | null {
  if (cycle.actual_cycle_length_days != null) return cycle.actual_cycle_length_days;
  const starts = startsOfActual(cycles);
  const idx = starts.indexOf(cycle.heat_start_date);
  if (idx <= 0) return null;
  return differenceInDays(parseISO(starts[idx]), parseISO(starts[idx - 1]));
}

export function pastHeatStatus(heatStart: string, mated: boolean): string {
  if (mated) return 'mated';
  const ago = daysSince(heatStart);
  if (ago != null && ago > 21) return 'completed';
  return 'in_heat';
}

export function dashboardSortKey(row: {
  activeHeat: HeatCycleRecord | null;
  pregnantCycle: HeatCycleRecord | null;
  isOverdue: boolean;
  daysRemaining: number | null;
}): number {
  if (row.activeHeat) return 0;
  if (row.pregnantCycle) return 1;
  if (row.isOverdue) return 2;
  if (row.daysRemaining == null) return 9000;
  return 100 + Math.max(0, row.daysRemaining);
}

export function femaleDaysRemaining(input: {
  activeHeat: HeatCycleRecord | null;
  pregnantCycle: HeatCycleRecord | null;
  forecast: HeatForecast | null;
  goHomeDate: string | null;
}): number | null {
  if (input.pregnantCycle) {
    const due = input.pregnantCycle.whelp_date_earliest ?? input.pregnantCycle.expected_whelp_date;
    return due ? daysUntil(due) : daysUntil(input.goHomeDate);
  }
  if (input.activeHeat) return daysSince(input.activeHeat.heat_start_date);
  if (input.forecast?.source === 'first_season') {
    const untilEarliest = daysUntil(input.forecast.rangeEarliest);
    if (untilEarliest != null && untilEarliest > 0) return untilEarliest;
    return daysUntil(input.forecast.rangeLatest);
  }
  if (input.forecast) return daysUntil(input.forecast.rangeEarliest);
  return null;
}

export function goHomeForCycle(
  cycle: HeatCycleRecord | null,
  litterGoHome: string | null | undefined,
): string | null {
  if (!cycle) return litterGoHome ?? null;
  if (litterGoHome) return litterGoHome;
  if (cycle.go_home_earliest) return cycle.go_home_earliest;
  const whelp = whelpWindow(
    cycle.ovulation_date,
    cycle.mating_date,
    cycle.expected_whelp_date,
    cycle.heat_start_date,
  );
  return goHomeWindow(whelp.expected).standard;
}

export { isActiveHeat };
