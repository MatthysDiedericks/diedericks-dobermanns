/**
 * Weighted dog-days for a date range.
 *
 * Shared kennel costs (feed, staff, transport, insurance) cannot be tagged
 * to a litter by hand. Spread them by who was on the ground:
 *
 *   adult on hand          → 1.0 per day
 *   dam while nursing      → nursingMultiplier (default 2.0); the extra above
 *                            1.0 is the litter's, her own 1.0 stays hers
 *   puppy on the ground    → puppyWeight (default 0.5) until go-home or death
 *   stillborn              → 0
 *
 * Inclusive of both ends of each stay. Pure: pass dogs, litters, settings.
 * Callers must show the working (formatWeightedWorking / allocateSharedAmount).
 */

import { normalizePuppyOutcome } from "../litters/outcomes";
import {
  DEFAULT_DOG_DAYS_SETTINGS,
  type DogDaysSettings,
} from "./allocationSettings";

const LEFT_KENNEL = new Set(["sold", "donated", "gifted"]);
const MS_PER_DAY = 86_400_000;

export type DogDaysDog = {
  id: string;
  date_of_birth: string | null;
  status: string | null;
  deceased_at: string | null;
  litter_id: string | null;
  outcome?: string | null;
  outcome_date?: string | null;
  handover_date?: string | null;
  placement_date?: string | null;
  delivered_at?: string | null;
  category?: string | null;
};

export type DogDaysLitter = {
  id: string;
  actual_date: string | null;
  go_home_date: string | null;
  go_home_weeks?: number | null;
  mother_id: string | null;
};

export type DogDaysSlice = {
  weightedDays: number;
  rawDays: number;
  from: string;
  to: string;
};

export type LitterDogDays = {
  litterId: string;
  puppyWeightedDays: number;
  nursingExtraDays: number;
  weightedDays: number;
  puppyCount: number;
  working: string;
};

export type DogDaysResult = {
  from: string;
  to: string;
  settings: DogDaysSettings;
  totalWeightedDays: number;
  byDog: Record<string, DogDaysSlice>;
  byLitter: Record<string, LitterDogDays>;
};

function dayNumber(iso: string): number {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / MS_PER_DAY);
}

function fromDayNumber(n: number): string {
  return new Date(n * MS_PER_DAY).toISOString().slice(0, 10);
}

function minDate(a: string, b: string): string {
  return a < b ? a : b;
}

function maxDate(a: string, b: string): string {
  return a > b ? a : b;
}

/** Inclusive calendar days from start through end, or 0 if inverted. */
export function inclusiveDays(start: string, end: string): number {
  const n = dayNumber(end) - dayNumber(start) + 1;
  return n > 0 ? n : 0;
}

function overlap(
  start: string,
  end: string,
  from: string,
  to: string,
): { start: string; end: string } | null {
  const s = maxDate(start, from);
  const e = minDate(end, to);
  if (s > e) return null;
  return { start: s, end: e };
}

function dateOnly(value: string | null | undefined): string | null {
  if (!value) return null;
  const d = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

function isPuppy(dog: DogDaysDog): boolean {
  if (dog.litter_id) return true;
  return (dog.category ?? "").toLowerCase() === "puppy";
}

/**
 * Last calendar day this dog is on hand. Null means still here through `to`.
 * Stillborn never spend a day.
 */
export function lastOnHandDay(
  dog: DogDaysDog,
  litter: DogDaysLitter | null,
): string | null {
  const outcome = normalizePuppyOutcome(dog.outcome);
  if (outcome === "stillborn") return null;

  const death =
    dateOnly(dog.deceased_at) ??
    (outcome === "died_early" ? dateOnly(dog.outcome_date) : null);
  const leave =
    dateOnly(dog.handover_date) ??
    dateOnly(dog.placement_date) ??
    dateOnly(dog.delivered_at) ??
    (isPuppy(dog) ? dateOnly(litter?.go_home_date) : null);

  const status = (dog.status ?? "").toLowerCase();
  const sold = LEFT_KENNEL.has(status);
  const candidates = [death];
  if (leave && (isPuppy(dog) || sold)) candidates.push(leave);
  const dated = candidates.filter((d): d is string => Boolean(d));
  if (dated.length === 0) return null;
  return dated.reduce((a, b) => (a < b ? a : b));
}

export function firstOnHandDay(
  dog: DogDaysDog,
  litter: DogDaysLitter | null,
): string | null {
  const outcome = normalizePuppyOutcome(dog.outcome);
  if (outcome === "stillborn") return null;
  return dateOnly(dog.date_of_birth) ?? dateOnly(litter?.actual_date);
}

function emptySlice(from: string, to: string): DogDaysSlice {
  return { weightedDays: 0, rawDays: 0, from, to };
}

function roundDays(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function periodLabel(from: string, to: string): string {
  const fmt = (iso: string) => {
    const [y, m, d] = iso.split("-");
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
    return `${Number(d)} ${months[Number(m) - 1]} ${y}`;
  };
  if (from === to) return fmt(from);
  return `${fmt(from)}–${fmt(to)}`;
}

export function formatWeightedWorking(
  share: number,
  total: number,
  from: string,
  to: string,
): string {
  const s = share.toLocaleString("en-ZA", { maximumFractionDigits: 3 });
  const t = total.toLocaleString("en-ZA", { maximumFractionDigits: 3 });
  return `${s} of ${t} weighted dog-days in ${periodLabel(from, to)}`;
}

export function allocateSharedAmount(input: {
  amount: number;
  shareWeightedDays: number;
  totalWeightedDays: number;
  category: string;
  from: string;
  to: string;
}): { share: number; working: string } {
  const { amount, shareWeightedDays, totalWeightedDays, category, from, to } =
    input;
  const share =
    totalWeightedDays > 0 ? (shareWeightedDays / totalWeightedDays) * amount : 0;
  const money = share.toLocaleString("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  });
  return {
    share,
    working: `${money} of ${category} — ${formatWeightedWorking(
      shareWeightedDays,
      totalWeightedDays,
      from,
      to,
    )}.`,
  };
}

export function computeDogDays(input: {
  from: string;
  to: string;
  dogs: DogDaysDog[];
  litters: DogDaysLitter[];
  settings?: Partial<DogDaysSettings>;
}): DogDaysResult {
  const from = input.from.slice(0, 10);
  const to = input.to.slice(0, 10);
  const settings: DogDaysSettings = {
    ...DEFAULT_DOG_DAYS_SETTINGS,
    ...input.settings,
  };
  const litterById = new Map(input.litters.map((l) => [l.id, l]));
  const nursingExtra = Math.max(0, settings.nursingMultiplier - 1);

  const byDog: Record<string, DogDaysSlice> = {};
  const litterPuppy = new Map<string, number>();
  const litterNursing = new Map<string, number>();
  const litterPuppyCount = new Map<string, number>();

  let totalWeightedDays = 0;

  for (const dog of input.dogs) {
    const litter = dog.litter_id ? litterById.get(dog.litter_id) ?? null : null;
    const start = firstOnHandDay(dog, litter);
    if (!start) {
      byDog[dog.id] = emptySlice(from, to);
      continue;
    }
    const last = lastOnHandDay(dog, litter);
    const end = last ?? to;
    const span = overlap(start, end, from, to);
    if (!span) {
      byDog[dog.id] = emptySlice(from, to);
      continue;
    }

    const rawDays = inclusiveDays(span.start, span.end);
    const puppy = isPuppy(dog);
    const weight = puppy ? settings.puppyWeight : 1;
    const weighted = roundDays(rawDays * weight);
    byDog[dog.id] = {
      weightedDays: weighted,
      rawDays,
      from: span.start,
      to: span.end,
    };
    totalWeightedDays += weighted;

    if (puppy && dog.litter_id) {
      litterPuppy.set(
        dog.litter_id,
        (litterPuppy.get(dog.litter_id) ?? 0) + weighted,
      );
      litterPuppyCount.set(
        dog.litter_id,
        (litterPuppyCount.get(dog.litter_id) ?? 0) + 1,
      );
    }
  }

  for (const litter of input.litters) {
    if (!litter.mother_id || !litter.actual_date) continue;
    const dam = input.dogs.find((d) => d.id === litter.mother_id);
    if (!dam) continue;
    const nurseStart = dateOnly(litter.actual_date);
    const weeks = litter.go_home_weeks && litter.go_home_weeks > 0 ? litter.go_home_weeks : 8;
    const nurseEnd =
      dateOnly(litter.go_home_date) ??
      fromDayNumber(dayNumber(nurseStart!) + weeks * 7);
    const span = overlap(nurseStart!, nurseEnd, from, to);
    if (!span) continue;
    const extra = roundDays(inclusiveDays(span.start, span.end) * nursingExtra);
    if (extra <= 0) continue;
    litterNursing.set(litter.id, (litterNursing.get(litter.id) ?? 0) + extra);
    // Extra sits in the kennel total and on the litter, not on the dam's
    // own slice — otherwise female P&L would charge nursing twice.
    totalWeightedDays += extra;
  }

  totalWeightedDays = roundDays(totalWeightedDays);

  const byLitter: Record<string, LitterDogDays> = {};
  const litterIds = new Set([
    ...input.litters.map((l) => l.id),
    ...litterPuppy.keys(),
    ...litterNursing.keys(),
  ]);
  for (const litterId of litterIds) {
    const puppyWeightedDays = roundDays(litterPuppy.get(litterId) ?? 0);
    const nursingExtraDays = roundDays(litterNursing.get(litterId) ?? 0);
    const weightedDays = roundDays(puppyWeightedDays + nursingExtraDays);
    byLitter[litterId] = {
      litterId,
      puppyWeightedDays,
      nursingExtraDays,
      weightedDays,
      puppyCount: litterPuppyCount.get(litterId) ?? 0,
      working: formatWeightedWorking(weightedDays, totalWeightedDays, from, to),
    };
  }

  return { from, to, settings, totalWeightedDays, byDog, byLitter };
}
