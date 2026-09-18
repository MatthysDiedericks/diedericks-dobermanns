/**
 * Whelping survival for a puppy. This is not dogs.status — stillborn is not
 * in dogs_status_check, and died_early is a neonatal fact, not a sale state.
 * Non-live outcomes still write status=deceased so existing filters hide them.
 */

export const PUPPY_OUTCOMES = [
  { value: "live", label: "Live" },
  { value: "stillborn", label: "Stillborn" },
  { value: "died_early", label: "Died early" },
] as const;

export type PuppyOutcome = (typeof PUPPY_OUTCOMES)[number]["value"];

export function isPuppyOutcome(value: string | null | undefined): value is PuppyOutcome {
  return value === "live" || value === "stillborn" || value === "died_early";
}

export function normalizePuppyOutcome(
  value: string | null | undefined,
): PuppyOutcome {
  return isPuppyOutcome(value) ? value : "live";
}

export function isNonLiveOutcome(value: string | null | undefined): boolean {
  const o = normalizePuppyOutcome(value);
  return o === "stillborn" || o === "died_early";
}

export function puppyDidNotSurvive(p: {
  outcome?: string | null;
  status?: string | null;
  deceased_at?: string | null;
}): boolean {
  if (isNonLiveOutcome(p.outcome)) return true;
  const status = (p.status ?? "").toLowerCase();
  if (status === "deceased" || status === "stillborn") return true;
  return Boolean(p.deceased_at);
}

export function statusForOutcome(outcome: PuppyOutcome): "available" | "deceased" {
  return outcome === "live" ? "available" : "deceased";
}

export function deceasedAtForOutcome(input: {
  outcome: PuppyOutcome;
  dateOfBirth: string;
  outcomeDate?: string | null;
}): string | null {
  if (input.outcome === "live") return null;
  return input.outcomeDate || input.dateOfBirth;
}

export function dogFieldsForOutcome(input: {
  outcome: PuppyOutcome;
  dateOfBirth: string;
  outcomeDate?: string | null;
  outcomeNote?: string | null;
}): {
  outcome: PuppyOutcome;
  outcome_date: string | null;
  outcome_note: string | null;
  status: "available" | "deceased";
  deceased_at: string | null;
} {
  const deceasedAt = deceasedAtForOutcome(input);
  return {
    outcome: input.outcome,
    outcome_date: deceasedAt,
    outcome_note: input.outcomeNote?.trim() || null,
    status: statusForOutcome(input.outcome),
    deceased_at: deceasedAt,
  };
}

export type LitterOutcomeCounts = {
  born: number;
  live: number;
  sold: number;
  retained: number;
  died: number;
};

const SOLD = new Set(["sold"]);
const RETAINED = new Set(["retained", "keep"]);

export function deriveLitterOutcomeCounts(
  pups: Array<{
    outcome?: string | null;
    status?: string | null;
    deceased_at?: string | null;
  }>,
): LitterOutcomeCounts {
  const counts: LitterOutcomeCounts = {
    born: pups.length,
    live: 0,
    sold: 0,
    retained: 0,
    died: 0,
  };
  for (const p of pups) {
    const status = (p.status ?? "").toLowerCase();
    if (puppyDidNotSurvive(p)) {
      counts.died += 1;
      continue;
    }
    counts.live += 1;
    if (SOLD.has(status)) counts.sold += 1;
    if (RETAINED.has(status)) counts.retained += 1;
  }
  return counts;
}

export function formatLitterOutcomeCounts(c: LitterOutcomeCounts): string {
  return `Born ${c.born} · Live ${c.live} · Sold ${c.sold} · Retained ${c.retained} · Died ${c.died}`;
}
