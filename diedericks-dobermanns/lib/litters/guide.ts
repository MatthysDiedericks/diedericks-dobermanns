/**
 * A litter is a process with three jobs: plan it, record each pup as it
 * arrives, then weigh. Status decides which job the screen puts in front.
 */

import {
  normalizePuppyOutcome,
  puppyDidNotSurvive,
  type PuppyOutcome,
} from '@/lib/litters/outcomes';

export type LitterGuidePhase = 'planned' | 'whelping' | 'rearing' | 'placed';

export const WHELPING_OUTCOME_BUTTONS: {
  value: PuppyOutcome;
  label: string;
}[] = [
  { value: 'live', label: 'Live' },
  { value: 'stillborn', label: 'Stillborn' },
  { value: 'died_early', label: 'Died shortly after' },
];

export function litterGuidePhase(input: {
  status: string | null | undefined;
  puppyCount: number;
}): LitterGuidePhase {
  const status = (input.status ?? '').toLowerCase();
  if (status === 'placed' || status === 'archived') return 'placed';
  if (status === 'planned' || status === 'expected') return 'planned';
  if (input.puppyCount <= 0) return 'whelping';
  return 'rearing';
}

export type PlannedGap = 'expected_date' | 'litter_letter';

export function plannedGaps(input: {
  expectedDate?: string | null;
  litterLetter?: string | null;
}): PlannedGap[] {
  const gaps: PlannedGap[] = [];
  if (!input.expectedDate?.trim()) gaps.push('expected_date');
  if (!input.litterLetter?.trim()) gaps.push('litter_letter');
  return gaps;
}

export function formatBirthTime(value: string | null | undefined): string {
  if (!value) return '';
  return value.slice(0, 5);
}

export function nowTimeHm(now = new Date()): string {
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

export function formatWhelpingProgress(
  pups: Array<{
    outcome?: string | null;
    status?: string | null;
    deceased_at?: string | null;
    birth_time?: string | null;
  }>,
): string {
  const born = pups.length;
  if (!born) return 'None recorded yet';
  let live = 0;
  let stillborn = 0;
  let died = 0;
  let lastTime: string | null = null;
  for (const p of pups) {
    const outcome = normalizePuppyOutcome(p.outcome);
    if (outcome === 'stillborn') stillborn += 1;
    else if (outcome === 'died_early') died += 1;
    else if (puppyDidNotSurvive(p)) died += 1;
    else live += 1;
    const t = formatBirthTime(p.birth_time);
    if (t && (!lastTime || t >= lastTime)) lastTime = t;
  }
  const bits = [`${born} born`, `${live} live`];
  if (stillborn) bits.push(`${stillborn} stillborn`);
  if (died) bits.push(`${died} died shortly after`);
  const head = `${bits[0]} · ${bits.slice(1).join(', ')}`;
  return lastTime ? `${head} · last at ${lastTime}` : head;
}

export function bornAgoLabel(
  actualDate: string | null | undefined,
  now = new Date(),
): string | null {
  if (!actualDate) return null;
  const born = new Date(`${actualDate.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(born.getTime())) return null;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const days = Math.round((today.getTime() - born.getTime()) / 86_400_000);
  if (days <= 0) return 'Born today';
  if (days === 1) return 'Born 1 day ago';
  return `Born ${days} days ago`;
}

export function litterNextAction(input: {
  status: string | null | undefined;
  puppyCount: number;
  expectedDate?: string | null;
  litterLetter?: string | null;
  actualDate?: string | null;
  weighedToday?: boolean;
  now?: Date;
}): string {
  const phase = litterGuidePhase(input);
  if (phase === 'planned') {
    const gaps = plannedGaps({
      expectedDate: input.expectedDate,
      litterLetter: input.litterLetter,
    });
    if (gaps.includes('expected_date')) return 'Add expected date';
    if (gaps.includes('litter_letter')) return 'Set litter letter';
    return 'Start whelping';
  }
  if (phase === 'whelping') return 'Record each pup as it arrives';
  if (phase === 'rearing') {
    const age = bornAgoLabel(input.actualDate, input.now);
    const pups = `${input.puppyCount} pup${input.puppyCount === 1 ? '' : 's'}`;
    const weigh = input.weighedToday ? 'weighed today' : 'not weighed today';
    return [age, pups, weigh].filter(Boolean).join(' · ');
  }
  return 'Litter placed';
}

const SESSION_ORDER: Record<string, number> = { AM: 1, daily: 2, PM: 3 };

export function latestPriorWeightKg(
  logs: Array<{
    recorded_date: string;
    weight_kg: number;
    session?: string | null;
    notes?: string | null;
  }>,
  date: string,
  session: 'AM' | 'PM' | 'daily',
): number | null {
  const currentOrd = SESSION_ORDER[session] ?? 2;
  const prior = logs.filter((l) => {
    if (l.recorded_date < date) return true;
    if (l.recorded_date > date) return false;
    const o = SESSION_ORDER[l.session ?? 'daily'] ?? 2;
    return o < currentOrd;
  });
  prior.sort((a, b) => {
    const d = a.recorded_date.localeCompare(b.recorded_date);
    if (d !== 0) return d;
    return (SESSION_ORDER[a.session ?? 'daily'] ?? 2) -
      (SESSION_ORDER[b.session ?? 'daily'] ?? 2);
  });
  const last = prior.at(-1);
  return last ? Number(last.weight_kg) : null;
}

/** Grams change vs previous reading. Null when there is nothing to compare. */
export function weighDeltaGrams(
  previousKg: number | null,
  nextKg: number | null,
): number | null {
  if (previousKg == null || nextKg == null) return null;
  return Math.round((nextKg - previousKg) * 1000);
}

/** Lost weight or gained nothing — the signal that matters in the first two weeks. */
export function isWeightConcern(deltaGrams: number | null): boolean {
  return deltaGrams != null && deltaGrams <= 0;
}

export function defaultWeighInSession(
  now: Date,
  recordedToday: ReadonlySet<string>,
): 'AM' | 'PM' {
  const preferred: 'AM' | 'PM' = now.getHours() < 12 ? 'AM' : 'PM';
  if (!recordedToday.has(preferred)) return preferred;
  const other: 'AM' | 'PM' = preferred === 'AM' ? 'PM' : 'AM';
  if (!recordedToday.has(other)) return other;
  return preferred;
}

export function sessionsRecordedToday(
  logs: Array<{
    recorded_date: string;
    session?: string | null;
    notes?: string | null;
  }>,
  date: string,
): Set<string> {
  const out = new Set<string>();
  for (const log of logs) {
    if (log.recorded_date !== date) continue;
    if ((log.notes ?? '') === 'Birth weight') continue;
    out.add(log.session ?? 'daily');
  }
  return out;
}

export function littersWeighedToday(
  dogs: Array<{ id: string; litter_id: string | null }>,
  logs: Array<{ dog_id: string; notes?: string | null }>,
): string[] {
  const litterOf = new Map(
    dogs
      .filter((d): d is { id: string; litter_id: string } => Boolean(d.litter_id))
      .map((d) => [d.id, d.litter_id]),
  );
  const out = new Set<string>();
  for (const log of logs) {
    if ((log.notes ?? '') === 'Birth weight') continue;
    const litterId = litterOf.get(log.dog_id);
    if (litterId) out.add(litterId);
  }
  return [...out];
}

export function parseGrams(raw: string): number | null {
  const n = parseInt(raw.replace(/\s/g, ''), 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}
