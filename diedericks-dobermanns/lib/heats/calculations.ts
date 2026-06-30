import { differenceInDays, parseISO } from 'date-fns';

import type { BreedHeatDefaults, HeatCycleRecord, ProgesteroneTest } from '@/lib/heats/constants';

export function computeIsOverdue(cycle: HeatCycleRecord): boolean {
  if (!cycle.is_predicted) return false;
  try {
    return parseISO(cycle.heat_start_date) < new Date(new Date().toDateString());
  } catch {
    return false;
  }
}

export function withOverdueFlag(cycle: HeatCycleRecord): HeatCycleRecord {
  return { ...cycle, is_overdue: computeIsOverdue(cycle) };
}

export function daysSince(date: string | null): number | null {
  if (!date) return null;
  try {
    return differenceInDays(new Date(), parseISO(date));
  } catch {
    return null;
  }
}

export function daysUntil(date: string | null): number | null {
  if (!date) return null;
  try {
    return differenceInDays(parseISO(date), new Date());
  } catch {
    return null;
  }
}

export function addDays(isoDate: string, days: number): string {
  const d = parseISO(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function autoHeatDates(
  heatStart: string,
  defaults: Pick<BreedHeatDefaults, 'proestrus_days' | 'ovulation_offset_days' | 'gestation_days'>,
) {
  return {
    proestrus_start_date: heatStart,
    estrus_start_date: addDays(heatStart, defaults.proestrus_days),
    ovulation_date: addDays(heatStart, defaults.ovulation_offset_days),
    expected_whelp_date: addDays(heatStart, defaults.ovulation_offset_days + defaults.gestation_days),
  };
}

export function breedingWindowEnd(ovulationDate: string): string {
  return addDays(ovulationDate, 4);
}

export function progesteroneColor(value: number): string {
  if (value > 15) return '#C4A35A';
  if (value > 5) return '#22c55e';
  if (value >= 2) return '#eab308';
  return '#8C8474';
}

export function personalCycleAverage(cycles: HeatCycleRecord[]): number | null {
  const lengths = cycles
    .filter((c) => !c.is_predicted && c.actual_cycle_length_days != null)
    .map((c) => c.actual_cycle_length_days as number);
  if (lengths.length === 0) return null;
  return Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length);
}

export function isActiveHeat(cycle: HeatCycleRecord): boolean {
  if (cycle.is_predicted) return false;
  return cycle.status === 'active' || cycle.status === 'in_heat';
}

export function parseProgesteroneTests(raw: unknown): ProgesteroneTest[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (t): t is ProgesteroneTest =>
      typeof t === 'object' &&
      t != null &&
      typeof (t as ProgesteroneTest).date === 'string' &&
      typeof (t as ProgesteroneTest).value_ng_ml === 'number',
  );
}
