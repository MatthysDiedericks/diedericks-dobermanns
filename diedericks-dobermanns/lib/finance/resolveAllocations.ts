/**
 * Resolve an invoice line into stored allocation rows.
 *
 * Call at capture. Persist the result. Never re-run against a later kennel
 * roster to "update" history — who was on the ground changes every week,
 * and last quarter's cost-per-dog must stay still.
 *
 * Dog-days (`computeDogDays`) is the weighting function for the default
 * shared set, not a report-time pool.
 */

import {
  computeDogDays,
  type DogDaysDog,
  type DogDaysLitter,
} from "./dogDays";
import {
  DEFAULT_DOG_DAYS_SETTINGS,
  type DogDaysSettings,
} from "./allocationSettings";

export const ALLOCATION_KINDS = ["company", "dog", "litter", "shared"] as const;
export type AllocationKind = (typeof ALLOCATION_KINDS)[number];

export type WeightingMode = "equal" | "weighted";

export type SharedRecipient = {
  dogId: string;
  litterId?: string | null;
  /** Adult 1, puppy 0.5, nursing dam 2.0 — or 1 for equal split. */
  weight: number;
  role?: "adult" | "puppy" | "nursing_dam";
};

export type ResolvedAllocation = {
  dogId: string | null;
  litterId: string | null;
  amount: number;
  weight: number;
  basisNote: string;
};

export type ResolveLineInput = {
  kind: AllocationKind;
  lineAmount: number;
  invoiceDate: string;
  dogId?: string | null;
  litterId?: string | null;
  recipients?: SharedRecipient[];
  weighting?: WeightingMode;
  settings?: Partial<DogDaysSettings>;
};

export function isAllocationKind(
  value: string | null | undefined,
): value is AllocationKind {
  return (
    value === "company" ||
    value === "dog" ||
    value === "litter" ||
    value === "shared"
  );
}

/**
 * Wrap mapping for existing expenses. Carry the current header type across.
 * Do not guess company vs shared — that is Matt's reclassify, not this wrap.
 */
export function mapLegacyAllocationToKind(
  allocationType: string | null | undefined,
): AllocationKind {
  if (allocationType === "dog") return "dog";
  if (allocationType === "litter") return "litter";
  if (allocationType === "company") return "company";
  return "shared";
}

export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

/** Live header check: sum of lines vs the invoice total, in cents. */
export function headerBalance(headerTotal: number, lineAmounts: number[]): {
  ok: boolean;
  difference: number;
} {
  const diff = fromCents(
    toCents(headerTotal) - lineAmounts.reduce((sum, n) => sum + toCents(n), 0),
  );
  return { ok: diff === 0, difference: diff };
}

export function allocationsBalance(
  lineAmount: number,
  allocationAmounts: number[],
): boolean {
  return (
    toCents(lineAmount) ===
    allocationAmounts.reduce((sum, n) => sum + toCents(n), 0)
  );
}

/**
 * Split `amount` across `weights`, to the cent. Remainder (positive or
 * negative) lands on the largest weight so nothing is lost to rounding.
 */
export function splitAmountByWeights(
  amount: number,
  weights: number[],
): number[] {
  if (weights.length === 0) return [];
  const totalCents = toCents(amount);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (totalWeight <= 0) return weights.map(() => 0);

  const rounded = weights.map((w) =>
    Math.round((totalCents * w) / totalWeight),
  );
  let largest = 0;
  for (let i = 1; i < weights.length; i += 1) {
    if (weights[i] > weights[largest]) largest = i;
  }
  const diff =
    totalCents - rounded.reduce((sum, n) => sum + n, 0);
  rounded[largest] += diff;
  return rounded.map(fromCents);
}

export function formatInvoiceDay(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${Number(d)} ${months[Number(m) - 1]} ${y}`;
}

function sharedBasisNote(
  count: number,
  invoiceDate: string,
  weighting: WeightingMode,
): string {
  const how = weighting === "equal" ? "equal split" : "weighted by age";
  return `${count} active dogs on ${formatInvoiceDay(invoiceDate)}, ${how}`;
}

function isPuppyDog(dog: DogDaysDog): boolean {
  if (dog.litter_id) return true;
  return (dog.category ?? "").toLowerCase() === "puppy";
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const ms = Date.UTC(y, m - 1, d) + days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

/** Litter the dam is nursing on `date`, or null. */
export function nursingLitterOnDate(
  dogId: string,
  litters: DogDaysLitter[],
  date: string,
): string | null {
  const day = date.slice(0, 10);
  for (const litter of litters) {
    if (litter.mother_id !== dogId || !litter.actual_date) continue;
    const start = litter.actual_date.slice(0, 10);
    const weeks =
      litter.go_home_weeks && litter.go_home_weeks > 0
        ? litter.go_home_weeks
        : 8;
    const end =
      litter.go_home_date?.slice(0, 10) ?? addDays(start, weeks * 7);
    if (day >= start && day <= end) return litter.id;
  }
  return null;
}

/**
 * Default shared set: every dog the kennel owned on the invoice date
 * (on-hand that day, including unsold puppies). Weights come from settings
 * unless `weighting` is equal.
 */
export function defaultSharedRecipients(input: {
  invoiceDate: string;
  dogs: DogDaysDog[];
  litters: DogDaysLitter[];
  weighting?: WeightingMode;
  settings?: Partial<DogDaysSettings>;
}): SharedRecipient[] {
  const date = input.invoiceDate.slice(0, 10);
  const weighting = input.weighting ?? "weighted";
  const settings: DogDaysSettings = {
    ...DEFAULT_DOG_DAYS_SETTINGS,
    ...input.settings,
  };
  const stay = computeDogDays({
    from: date,
    to: date,
    dogs: input.dogs,
    litters: input.litters,
    settings,
  });

  const recipients: SharedRecipient[] = [];
  for (const dog of input.dogs) {
    if ((stay.byDog[dog.id]?.rawDays ?? 0) <= 0) continue;
    const nursingLitterId = nursingLitterOnDate(dog.id, input.litters, date);
    const puppy = isPuppyDog(dog);
    let role: SharedRecipient["role"] = "adult";
    let weight = 1;
    if (weighting === "weighted") {
      if (nursingLitterId) {
        role = "nursing_dam";
        weight = settings.nursingMultiplier;
      } else if (puppy) {
        role = "puppy";
        weight = settings.puppyWeight;
      }
    }
    recipients.push({
      dogId: dog.id,
      litterId: puppy ? dog.litter_id : nursingLitterId,
      weight,
      role,
    });
  }
  return recipients;
}

export function resolveExpenseLineAllocations(
  input: ResolveLineInput,
): ResolvedAllocation[] {
  const date = input.invoiceDate.slice(0, 10);
  const amount = input.lineAmount;
  const weighting = input.weighting ?? "weighted";

  if (input.kind === "company") return [];

  if (input.kind === "dog") {
    if (!input.dogId) {
      throw new Error("A dog line needs a dog.");
    }
    return [
      {
        dogId: input.dogId,
        litterId: null,
        amount: fromCents(toCents(amount)),
        weight: 1,
        basisNote: "direct to one dog",
      },
    ];
  }

  if (input.kind === "litter") {
    if (!input.litterId) {
      throw new Error("A litter line needs a litter.");
    }
    return [
      {
        dogId: null,
        litterId: input.litterId,
        amount: fromCents(toCents(amount)),
        weight: 1,
        basisNote: "direct to one litter",
      },
    ];
  }

  const recipients = input.recipients ?? [];
  if (recipients.length === 0) {
    throw new Error("A shared line needs at least one dog.");
  }

  const weights = recipients.map((r) => r.weight);
  const amounts = splitAmountByWeights(amount, weights);
  const note = sharedBasisNote(recipients.length, date, weighting);

  return recipients.map((r, i) => ({
    dogId: r.dogId,
    litterId: r.litterId ?? null,
    amount: amounts[i],
    weight: r.weight,
    basisNote: note,
  }));
}

export function totalsByKind(
  lines: Array<{ kind: AllocationKind; amount: number }>,
): Record<AllocationKind, number> {
  const totals: Record<AllocationKind, number> = {
    company: 0,
    dog: 0,
    litter: 0,
    shared: 0,
  };
  for (const line of lines) {
    totals[line.kind] = fromCents(
      toCents(totals[line.kind]) + toCents(line.amount),
    );
  }
  return totals;
}
