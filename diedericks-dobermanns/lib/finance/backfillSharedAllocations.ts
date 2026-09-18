/**
 * Plan frozen shared splits for historical lines that have none.
 *
 * Pure: no I/O. Skip any line that already has an allocation. If the kennel
 * held no dogs on the expense date, leave the line unallocated — do not guess.
 */

import { firstOnHandDay, type DogDaysDog, type DogDaysLitter } from "./dogDays";
import {
  DEFAULT_DOG_DAYS_SETTINGS,
  type DogDaysSettings,
} from "./allocationSettings";
import {
  allocationsBalance,
  defaultSharedRecipients,
  resolveExpenseLineAllocations,
  type ResolvedAllocation,
} from "./resolveAllocations";

export type SharedLineToResolve = {
  id: string;
  lineAmount: number;
  expenseDate: string;
  description: string;
  supplierName: string | null;
  invoiceReference: string | null;
};

export type PlannedAllocationRow = {
  expense_line_id: string;
  dog_id: string | null;
  litter_id: string | null;
  amount: number;
  weight: number;
  basis_note: string | null;
};

export type BackfillException = {
  line: SharedLineToResolve;
  reason: "before_first_dog" | "no_dogs_on_date";
};

export type SharedBackfillPlan = {
  toInsert: PlannedAllocationRow[];
  resolved: SharedLineToResolve[];
  skippedAlreadyAllocated: number;
  exceptions: BackfillException[];
  totalValueCovered: number;
  allocationsToCreate: number;
  earliestDogDay: string | null;
};

export function earliestOnHandDay(
  dogs: DogDaysDog[],
  litters: DogDaysLitter[],
): string | null {
  const litterById = new Map(litters.map((l) => [l.id, l]));
  let earliest: string | null = null;
  for (const dog of dogs) {
    const litter = dog.litter_id
      ? (litterById.get(dog.litter_id) ?? null)
      : null;
    const start = firstOnHandDay(dog, litter);
    if (!start) continue;
    if (!earliest || start < earliest) earliest = start;
  }
  return earliest;
}

function toRow(
  lineId: string,
  allocation: ResolvedAllocation,
): PlannedAllocationRow {
  return {
    expense_line_id: lineId,
    dog_id: allocation.dogId,
    litter_id: allocation.litterId,
    amount: allocation.amount,
    weight: allocation.weight,
    basis_note: allocation.basisNote,
  };
}

export function planSharedAllocationBackfill(input: {
  lines: SharedLineToResolve[];
  allocatedLineIds: Iterable<string>;
  dogs: DogDaysDog[];
  litters: DogDaysLitter[];
  settings?: Partial<DogDaysSettings>;
}): SharedBackfillPlan {
  const allocated = new Set(input.allocatedLineIds);
  const settings: DogDaysSettings = {
    ...DEFAULT_DOG_DAYS_SETTINGS,
    ...input.settings,
  };
  const earliestDogDay = earliestOnHandDay(input.dogs, input.litters);

  const toInsert: PlannedAllocationRow[] = [];
  const resolved: SharedLineToResolve[] = [];
  const exceptions: BackfillException[] = [];
  let skippedAlreadyAllocated = 0;
  let totalValueCovered = 0;

  for (const line of input.lines) {
    if (allocated.has(line.id)) {
      skippedAlreadyAllocated += 1;
      continue;
    }

    const date = line.expenseDate.slice(0, 10);
    const recipients = defaultSharedRecipients({
      invoiceDate: date,
      dogs: input.dogs,
      litters: input.litters,
      weighting: "weighted",
      settings,
    });

    if (recipients.length === 0) {
      const reason: BackfillException["reason"] =
        !earliestDogDay || date < earliestDogDay
          ? "before_first_dog"
          : "no_dogs_on_date";
      exceptions.push({ line, reason });
      continue;
    }

    const allocations = resolveExpenseLineAllocations({
      kind: "shared",
      lineAmount: line.lineAmount,
      invoiceDate: date,
      recipients,
      weighting: "weighted",
      settings,
    });
    if (!allocationsBalance(line.lineAmount, allocations.map((a) => a.amount))) {
      throw new Error(
        `Resolver failed to balance line ${line.id} (${line.lineAmount}).`,
      );
    }

    for (const allocation of allocations) {
      toInsert.push(toRow(line.id, allocation));
    }
    resolved.push(line);
    totalValueCovered += line.lineAmount;
  }

  return {
    toInsert,
    resolved,
    skippedAlreadyAllocated,
    exceptions,
    totalValueCovered,
    allocationsToCreate: toInsert.length,
    earliestDogDay,
  };
}

export function exceptionReasonLabel(reason: BackfillException["reason"]): string {
  if (reason === "before_first_dog") {
    return "expense date is before the first recorded dog";
  }
  return "no dogs on the property that day";
}
