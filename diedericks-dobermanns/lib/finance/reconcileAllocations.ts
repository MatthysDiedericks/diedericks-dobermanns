/**
 * Audit the four cost classes against stored allocations.
 *
 * Total expenses = company + dog + litter + shared.
 * Company lines have no animal split — that is correct.
 * Every other line must have allocations that sum to the line, to the cent.
 */

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
};

function kindNeedsSplit(kind: AllocationKind): boolean {
  return kind !== "company";
}

export function reconcileExpenseAllocations(input: {
  lines: ReconcileLine[];
  allocatedCentsByLineId: Map<string, number>;
  headerTotal?: number | null;
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
  };
}

export function exceptionListLabel(row: AllocationException): string {
  if (row.reason === "no_allocation") {
    return "no stored split";
  }
  return `allocations ${row.allocatedAmount.toFixed(2)} ≠ line ${row.lineAmount.toFixed(2)}`;
}
