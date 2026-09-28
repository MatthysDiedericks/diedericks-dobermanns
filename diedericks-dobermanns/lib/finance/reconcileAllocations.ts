/**
 * Audit the four cost classes against stored allocations.
 *
 * Total expenses = company + dog + litter + shared.
 * Company lines have no animal split — that is correct.
 * Every other line must have allocations that sum to the line, to the cent.
 * Allocations to dogs that had already left must read zero.
 */

import {
  hasUnresolvedDeparture,
  wasOnPropertyOn,
  type DogLifecycle,
} from "./dogDays";
import {
  allocationsBalance,
  fromCents,
  toCents,
  totalsByKind,
  type AllocationKind,
} from "./resolveAllocations";

export type ReconcileLine = {
  id: string;
  expenseId: string;
  expenseDate: string;
  description: string;
  supplierName: string | null;
  invoiceReference: string | null;
  kind: AllocationKind;
  lineAmount: number;
};

export type AllocationException = {
  lineId: string;
  expenseId: string;
  expenseDate: string;
  description: string;
  supplierName: string | null;
  invoiceReference: string | null;
  kind: AllocationKind;
  lineAmount: number;
  allocatedAmount: number;
  reason: "no_allocation" | "sum_mismatch";
};

export type AllocationReconciliation = {
  byKind: Record<AllocationKind, number>;
  total: number;
  kindsSum: number;
  kindsMatchTotal: boolean;
  headerTotal: number | null;
  linesMatchHeader: boolean;
  exceptions: AllocationException[];
  departedDogs: DepartedDogsCheck;
};

export type DepartedAllocation = {
  lineId: string;
  expenseDate: string;
  dogId: string;
  amount: number;
};

export type DepartedDogsCheck = {
  lineCount: number;
  amount: number;
  allocationCount: number;
  rows: DepartedAllocation[];
};

const EMPTY_DEPARTED: DepartedDogsCheck = {
  lineCount: 0,
  amount: 0,
  allocationCount: 0,
  rows: [],
};

export type StoredDogAllocation = {
  lineId: string;
  dogId: string | null;
  amount: number;
};

function expenseDateUtc(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T00:00:00.000Z`);
}

/**
 * Allocations charged to a dog after it had left — or to a dog whose
 * departure cannot be resolved. Must read zero.
 */
export function findAllocationsToDepartedDogs(input: {
  lines: Array<{ id: string; expenseDate: string }>;
  allocations: StoredDogAllocation[];
  dogs: DogLifecycle[];
}): DepartedAllocation[] {
  const dogById = new Map(
    input.dogs.filter((d) => d.id).map((d) => [d.id as string, d]),
  );
  const dateByLine = new Map(input.lines.map((l) => [l.id, l.expenseDate.slice(0, 10)]));
  const rows: DepartedAllocation[] = [];
  for (const alloc of input.allocations) {
    if (!alloc.dogId) continue;
    const expenseDate = dateByLine.get(alloc.lineId);
    if (!expenseDate) continue;
    const dog = dogById.get(alloc.dogId);
    if (!dog) continue;
    const on = expenseDateUtc(expenseDate);
    const left =
      hasUnresolvedDeparture(dog) || !wasOnPropertyOn(dog, on);
    if (!left) continue;
    rows.push({
      lineId: alloc.lineId,
      expenseDate,
      dogId: alloc.dogId,
      amount: alloc.amount,
    });
  }
  return rows;
}

export function summarizeDepartedAllocations(
  rows: DepartedAllocation[],
): DepartedDogsCheck {
  const lineIds = new Set(rows.map((r) => r.lineId));
  const amount = fromCents(rows.reduce((s, r) => s + toCents(r.amount), 0));
  return {
    lineCount: lineIds.size,
    amount,
    allocationCount: rows.length,
    rows,
  };
}

export function departedDogsLabel(check: DepartedDogsCheck): string {
  return `${check.lineCount} line${check.lineCount === 1 ? "" : "s"}, R ${check.amount.toFixed(2)}`;
}

function kindNeedsSplit(kind: AllocationKind): boolean {
  return kind !== "company";
}

export function reconcileExpenseAllocations(input: {
  lines: ReconcileLine[];
  allocatedCentsByLineId: Map<string, number>;
  headerTotal?: number | null;
  departedDogs?: DepartedDogsCheck;
}): AllocationReconciliation {
  const byKind = totalsByKind(
    input.lines.map((line) => ({ kind: line.kind, amount: line.lineAmount })),
  );
  const total = fromCents(
    toCents(byKind.company) +
      toCents(byKind.dog) +
      toCents(byKind.litter) +
      toCents(byKind.shared),
  );
  const headerTotal =
    input.headerTotal == null ? null : fromCents(toCents(input.headerTotal));

  const exceptions: AllocationException[] = [];
  for (const line of input.lines) {
    const allocatedCents = input.allocatedCentsByLineId.get(line.id) ?? 0;
    const allocatedAmount = fromCents(allocatedCents);
    if (!kindNeedsSplit(line.kind)) {
      if (allocatedCents === 0) continue;
      if (allocationsBalance(line.lineAmount, [allocatedAmount])) continue;
      exceptions.push({
        lineId: line.id,
        expenseId: line.expenseId,
        expenseDate: line.expenseDate,
        description: line.description,
        supplierName: line.supplierName,
        invoiceReference: line.invoiceReference,
        kind: line.kind,
        lineAmount: line.lineAmount,
        allocatedAmount,
        reason: "sum_mismatch",
      });
      continue;
    }
    if (allocatedCents === 0) {
      exceptions.push({
        lineId: line.id,
        expenseId: line.expenseId,
        expenseDate: line.expenseDate,
        description: line.description,
        supplierName: line.supplierName,
        invoiceReference: line.invoiceReference,
        kind: line.kind,
        lineAmount: line.lineAmount,
        allocatedAmount: 0,
        reason: "no_allocation",
      });
      continue;
    }
    if (!allocationsBalance(line.lineAmount, [allocatedAmount])) {
      exceptions.push({
        lineId: line.id,
        expenseId: line.expenseId,
        expenseDate: line.expenseDate,
        description: line.description,
        supplierName: line.supplierName,
        invoiceReference: line.invoiceReference,
        kind: line.kind,
        lineAmount: line.lineAmount,
        allocatedAmount,
        reason: "sum_mismatch",
      });
    }
  }

  return {
    byKind,
    total,
    kindsSum: total,
    kindsMatchTotal: true,
    headerTotal,
    linesMatchHeader:
      headerTotal == null ? true : toCents(total) === toCents(headerTotal),
    exceptions,
    departedDogs: input.departedDogs ?? EMPTY_DEPARTED,
  };
}

export function exceptionListLabel(row: AllocationException): string {
  if (row.reason === "no_allocation") {
    return "no stored split";
  }
  return `allocations ${row.allocatedAmount.toFixed(2)} ≠ line ${row.lineAmount.toFixed(2)}`;
}
