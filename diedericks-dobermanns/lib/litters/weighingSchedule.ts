import { differenceInDays, differenceInHours, parseISO } from 'date-fns';

export type WeighingPhase = 'twice-daily' | 'daily' | 'complete';
export type WeighingSession = 'AM' | 'PM' | 'daily';

export interface WeighingSummary {
  ageDays: number;
  phase: WeighingPhase;
  lastWeighedAt: Date | null;
  isDueNow: boolean;
  isDueSoon: boolean;
  nextSessionLabel: string;
}

export function getAgeDays(whelpDate: string | null | undefined, ref = new Date()): number {
  if (!whelpDate) return 0;
  try {
    return Math.max(0, differenceInDays(ref, parseISO(whelpDate.slice(0, 10))));
  } catch {
    return 0;
  }
}

export function getWeighingPhase(ageDays: number): WeighingPhase {
  if (ageDays >= 71) return 'complete';
  if (ageDays >= 14) return 'daily';
  return 'twice-daily';
}

/** Auto-select session from clock: before 14:00 → AM, else PM. */
export function defaultSession(now = new Date()): WeighingSession {
  return now.getHours() < 14 ? 'AM' : 'PM';
}

export function getWeighingSummary(
  whelpDate: string | null | undefined,
  lastWeighedAt: Date | null,
  now = new Date(),
): WeighingSummary {
  const ageDays = getAgeDays(whelpDate, now);
  const phase = getWeighingPhase(ageDays);

  if (phase === 'complete') {
    return {
      ageDays,
      phase,
      lastWeighedAt,
      isDueNow: false,
      isDueSoon: false,
      nextSessionLabel: 'Weighing complete',
    };
  }

  const hoursSince = lastWeighedAt ? differenceInHours(now, lastWeighedAt) : Infinity;
  const dueThreshold = phase === 'twice-daily' ? 10 : 22;
  const isDueNow = hoursSince >= dueThreshold;
  const isDueSoon = !isDueNow && hoursSince >= dueThreshold - 2;

  let nextSessionLabel = 'Daily weighing';
  if (phase === 'twice-daily') {
    const session = defaultSession(now);
    nextSessionLabel = session === 'AM' ? 'AM session due' : 'PM session due';
  }

  return { ageDays, phase, lastWeighedAt, isDueNow, isDueSoon, nextSessionLabel };
}

export function formatWeightGrams(weightKg: number): string {
  const grams = Math.round(weightKg * 1000);
  if (grams >= 1000) {
    const kg = Math.floor(grams / 1000);
    const rem = grams % 1000;
    return `${kg} kg ${rem} g`;
  }
  return `${grams} g`;
}

export function weekNumberFromWhelp(whelpDate: string, dateIso: string): number {
  const age = getAgeDays(whelpDate, parseISO(dateIso.slice(0, 10)));
  return Math.floor(age / 7) + 1;
}
