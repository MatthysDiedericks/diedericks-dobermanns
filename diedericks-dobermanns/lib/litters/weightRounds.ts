/**
 * session is only the AM / PM / daily label. recorded_at is the reading.
 * Interval schedules keep session = 'daily' so the label is not asked to
 * mean "the 14:00 round". The timestamp carries that.
 */

export type WeighingSessionLabel = 'AM' | 'PM' | 'daily';

export type WeighingSchedule =
  | 'am_pm'
  | 'every_1h'
  | 'every_2h'
  | 'every_4h'
  | 'every_6h'
  | 'every_12h'
  | 'daily';

/**
 * every_12h is twice daily on the clock. am_pm is also twice daily, but it is
 * whenever the morning and evening rounds happen to be done — the two are not
 * the same thing, and a fading puppy is watched on the clock.
 */
export const WEIGHING_SCHEDULES: { id: WeighingSchedule; label: string; hours: number | null }[] = [
  { id: 'am_pm', label: 'AM / PM', hours: null },
  { id: 'every_1h', label: 'Every hour', hours: 1 },
  { id: 'every_2h', label: 'Every 2 hours', hours: 2 },
  { id: 'every_4h', label: 'Every 4 hours', hours: 4 },
  { id: 'every_6h', label: 'Every 6 hours', hours: 6 },
  { id: 'every_12h', label: 'Every 12 hours', hours: 12 },
  { id: 'daily', label: 'Daily', hours: 24 },
];

/** First 21 days after whelping. Day 22 returns the page to its normal layout. */
export const WEIGHT_RISK_DAYS = 21;

export function localDateIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function ageDays(actualDate: string | null | undefined, now = new Date()): number | null {
  if (!actualDate) return null;
  const born = new Date(`${actualDate.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(born.getTime())) return null;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((today.getTime() - born.getTime()) / 86_400_000));
}

/** No actual_date (planned or expected) never leads with the weight chart. */
export function weightsLeadTheLitter(
  actualDate: string | null | undefined,
  now = new Date(),
): boolean {
  const age = ageDays(actualDate, now);
  if (age == null) return false;
  return age <= WEIGHT_RISK_DAYS;
}

export function sessionForSchedule(
  schedule: WeighingSchedule,
  now = new Date(),
): WeighingSessionLabel {
  if (schedule === 'daily') return 'daily';
  if (schedule !== 'am_pm') return 'daily';
  return now.getHours() < 12 ? 'AM' : 'PM';
}

export type WeightInsert = {
  dog_id: string;
  weight_kg: number;
  recorded_date: string;
  recorded_at: string;
  session: WeighingSessionLabel;
};

/**
 * One reading. `recordedDate` is the kennel day on the form. `recordedAt` is
 * when this puppy's weight was entered, not when the round was opened.
 * Re-weighing the same dog, day, and session upserts this row.
 */
export function weightLogInsert(input: {
  dogId: string;
  weightKg: number;
  recordedAt: Date;
  session: WeighingSessionLabel;
  recordedDate?: string;
}): WeightInsert {
  return {
    dog_id: input.dogId,
    weight_kg: input.weightKg,
    recorded_date: input.recordedDate ?? localDateIso(input.recordedAt),
    recorded_at: input.recordedAt.toISOString(),
    session: input.session,
  };
}

/** Twelve readings in one day must be twelve different timestamps. */
export function intervalReadings(input: {
  dogId: string;
  start: Date;
  count: number;
  everyHours: number;
  weightKg: number;
}): WeightInsert[] {
  const rows: WeightInsert[] = [];
  for (let i = 0; i < input.count; i += 1) {
    const at = new Date(input.start.getTime() + i * input.everyHours * 3_600_000);
    rows.push(
      weightLogInsert({
        dogId: input.dogId,
        weightKg: input.weightKg + i * 0.001,
        recordedAt: at,
        session: 'daily',
      }),
    );
  }
  return rows;
}

export function scheduleIntervalHours(schedule: WeighingSchedule): number | null {
  return WEIGHING_SCHEDULES.find((s) => s.id === schedule)?.hours ?? null;
}

export function weighingDue(input: {
  schedule: WeighingSchedule;
  lastWeighedAt: Date | null;
  now?: Date;
}): { hoursSince: number | null; nextDueAt: Date | null; label: string } {
  const now = input.now ?? new Date();
  const hours = scheduleIntervalHours(input.schedule);
  const hoursSince =
    input.lastWeighedAt == null
      ? null
      : Math.max(0, (now.getTime() - input.lastWeighedAt.getTime()) / 3_600_000);

  if (input.schedule === 'am_pm') {
    const afternoon = now.getHours() >= 12;
    const next = new Date(now);
    if (!afternoon) {
      next.setHours(12, 0, 0, 0);
    } else {
      next.setDate(next.getDate() + 1);
      next.setHours(6, 0, 0, 0);
    }
    const since =
      hoursSince == null ? 'No round yet' : `${formatHours(hoursSince)} since the last round`;
    return {
      hoursSince,
      nextDueAt: next,
      label: `${since} · next ${afternoon ? 'AM' : 'PM'} ${formatClock(next)}`,
    };
  }

  if (hours == null) {
    return { hoursSince, nextDueAt: null, label: 'Weigh when you can' };
  }

  const nextDueAt = input.lastWeighedAt
    ? new Date(input.lastWeighedAt.getTime() + hours * 3_600_000)
    : now;
  const since =
    hoursSince == null ? 'No round yet' : `${formatHours(hoursSince)} since the last round`;
  const overdue = nextDueAt.getTime() <= now.getTime();
  return {
    hoursSince,
    nextDueAt,
    label: overdue
      ? `${since} · due now`
      : `${since} · next ${formatClock(nextDueAt)}`,
  };
}

function formatHours(hours: number): string {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  const whole = Math.floor(hours);
  const mins = Math.round((hours - whole) * 60);
  if (mins === 0) return `${whole} h`;
  return `${whole} h ${mins} min`;
}

function formatClock(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export type WeightReading = {
  weight_kg: number;
  recorded_at?: string | null;
  recorded_date: string;
  notes?: string | null;
};

export function readingsChronological(logs: WeightReading[]): WeightReading[] {
  return [...logs].sort((a, b) => readingTime(a) - readingTime(b));
}

function readingTime(log: WeightReading): number {
  const raw = log.recorded_at ?? `${log.recorded_date}T12:00:00`;
  const t = new Date(raw).getTime();
  return Number.isNaN(t) ? 0 : t;
}

/** Has not gained since the previous reading. */
export function hasNotGained(logs: WeightReading[]): boolean {
  const usable = readingsChronological(logs);
  if (usable.length < 2) return false;
  const prev = usable[usable.length - 2];
  const last = usable[usable.length - 1];
  return Number(last.weight_kg) <= Number(prev.weight_kg);
}

/** Still under birth weight once the pup is 48 hours old. */
export function belowBirthWeightAfter48h(input: {
  birthWeightGrams: number | null | undefined;
  actualDate: string | null | undefined;
  birthTime?: string | null;
  latestKg: number | null;
  now?: Date;
}): boolean {
  if (input.birthWeightGrams == null || input.birthWeightGrams <= 0) return false;
  if (input.latestKg == null) return false;
  if (!input.actualDate) return false;
  const time = (input.birthTime ?? '00:00').slice(0, 5);
  const born = new Date(`${input.actualDate.slice(0, 10)}T${time}:00`);
  if (Number.isNaN(born.getTime())) return false;
  const now = input.now ?? new Date();
  const hours = (now.getTime() - born.getTime()) / 3_600_000;
  if (hours < 48) return false;
  return input.latestKg * 1000 < input.birthWeightGrams;
}

export function weightSaveMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  if (typeof error === 'string' && error.trim()) return error.trim();
  return 'Could not save this weight.';
}

const WEIGH_MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

/** 2026-09-28 → "28 Sep". */
export function formatWeighDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return iso;
  return `${day} ${WEIGH_MONTHS[month - 1] ?? iso}`;
}

export function formatWeightKg(kg: number): string {
  return (Math.round(kg * 1000) / 1000).toFixed(3);
}

export type WeightRoundEntry = {
  dogId: string;
  name: string;
  weightKg: number;
  /** ISO time captured when this puppy's weight was typed. */
  recordedAt: string;
};

export type WeightRoundFailure = {
  dogId: string;
  name: string;
  reason: string;
};

export type WeightRoundUpdate = {
  dogId: string;
  name: string;
  session: string;
  fromKg: number;
  toKg: number;
};

export type WeightRoundResult = {
  attempted: number;
  saved: number;
  updates: WeightRoundUpdate[];
  failures: WeightRoundFailure[];
};

export function describeWeightWriteError(
  error: { message?: string; code?: string },
  session: string,
  recordedDate: string,
): string {
  const message = error.message?.trim() || 'The database rejected this weight.';
  const duplicate =
    error.code === '23505' ||
    /duplicate key|unique constraint|idx_weight_logs_dog_date_session/i.test(message);
  if (duplicate) {
    return `duplicate entry for ${session} on ${formatWeighDate(recordedDate)}`;
  }
  return message;
}

export function weightUpdateSentence(update: WeightRoundUpdate): string {
  return `${update.name} ${update.session} updated from ${formatWeightKg(update.fromKg)} to ${formatWeightKg(update.toKg)} kg.`;
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? 'A puppy';
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** "Saved 6 of 6." or "Saved 4 of 6. K3 and K5 failed: …" plus re-weigh lines. */
export function weightRoundSummary(result: WeightRoundResult): string {
  const head = `Saved ${result.saved} of ${result.attempted}.`;
  const lines: string[] = [];
  if (result.failures.length === 0) {
    lines.push(head);
  } else {
    const byReason = new Map<string, string[]>();
    for (const failure of result.failures) {
      const names = byReason.get(failure.reason) ?? [];
      names.push(failure.name);
      byReason.set(failure.reason, names);
    }
    const parts = [...byReason.entries()].map(
      ([reason, names]) => `${joinNames(names)} failed: ${reason}`,
    );
    lines.push(`${head} ${parts.join('. ')}.`);
  }
  for (const update of result.updates) lines.push(weightUpdateSentence(update));
  return lines.join('\n');
}

export type WeightLogWriter = {
  findExisting(
    dogId: string,
    recordedDate: string,
    session: WeighingSessionLabel,
  ): Promise<{ weight_kg: number } | null>;
  upsert(row: WeightInsert): Promise<{ error: { message?: string; code?: string } | null }>;
};

/**
 * One round, one call. Each puppy is upserted on (dog, date, session) so a
 * bad row is named and the others still land.
 */
export async function saveWeightRound(
  writer: WeightLogWriter,
  input: {
    recordedDate: string;
    session: WeighingSessionLabel;
    entries: WeightRoundEntry[];
  },
): Promise<WeightRoundResult> {
  const failures: WeightRoundFailure[] = [];
  const updates: WeightRoundUpdate[] = [];
  let saved = 0;

  for (const entry of input.entries) {
    const name = entry.name.trim() || 'A puppy';
    const recordedAt = new Date(entry.recordedAt);
    if (Number.isNaN(recordedAt.getTime())) {
      failures.push({
        dogId: entry.dogId,
        name,
        reason: 'Missing the time this weight was entered.',
      });
      continue;
    }
    try {
      const existing = await writer.findExisting(
        entry.dogId,
        input.recordedDate,
        input.session,
      );
      const row = weightLogInsert({
        dogId: entry.dogId,
        weightKg: entry.weightKg,
        recordedAt,
        recordedDate: input.recordedDate,
        session: input.session,
      });
      const { error } = await writer.upsert(row);
      if (error) {
        failures.push({
          dogId: entry.dogId,
          name,
          reason: describeWeightWriteError(error, input.session, input.recordedDate),
        });
        continue;
      }
      saved += 1;
      if (existing && Math.round(existing.weight_kg * 1000) !== Math.round(entry.weightKg * 1000)) {
        updates.push({
          dogId: entry.dogId,
          name,
          session: input.session,
          fromKg: existing.weight_kg,
          toKg: entry.weightKg,
        });
      }
    } catch (error) {
      failures.push({
        dogId: entry.dogId,
        name,
        reason: weightSaveMessage(error),
      });
    }
  }

  return {
    attempted: input.entries.length,
    saved,
    updates,
    failures,
  };
}

/** The synthetic first column: birth weight, which is not a weight_logs row. */
export const BIRTH_ROUND_KEY = '0000-00-00#birth';

/**
 * A column is a *round*, and a round is a day plus a slot — never a timestamp.
 *
 * recorded_at is when the number was typed. recorded_date is the day the puppy
 * was actually weighed, and those are different whenever a round is written up
 * later: on 29 Sep 2026 the Odessa litter's 28 Sep round was entered at 07:51
 * and the 29 Sep round at 07:52, so keying on the timestamp put both under
 * "29 Sept" and split each round across as many columns as there were minutes
 * of typing. The day the puppy stood on the scale is the identity of the round.
 *
 * AM and PM are slots of their own. Interval schedules record session 'daily'
 * many times a day, so there the hour is the slot — that is the only case where
 * a clock time belongs in a column at all.
 */
export function roundKey(log: {
  recorded_at?: string | null;
  recorded_date: string;
  session?: string | null;
}): string {
  const day = log.recorded_date.slice(0, 10);
  const session = log.session ?? 'daily';
  if (session === 'AM' || session === 'PM') return `${day}#${session}`;
  if (log.recorded_at) {
    const at = new Date(log.recorded_at);
    if (!Number.isNaN(at.getTime())) {
      return `${day}#${String(at.getHours()).padStart(2, '0')}h`;
    }
  }
  return `${day}#daily`;
}

/** "28 Sep", "28 Sep AM", "28 Sep 14:00" — the day first, always. */
export function roundLabel(key: string): string {
  if (key === BIRTH_ROUND_KEY) return 'Birth';
  const [day, slot] = key.split('#');
  if (!day || !slot) return key;
  const date = formatWeighDate(day);
  if (slot === 'AM' || slot === 'PM') return `${date} ${slot}`;
  if (slot === 'daily') return date;
  const hour = /^(\d{2})h$/.exec(slot);
  if (hour) return `${date} ${hour[1]}:00`;
  return date;
}
