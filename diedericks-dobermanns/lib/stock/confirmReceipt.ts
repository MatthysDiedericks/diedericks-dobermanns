import type { DogDaysDog, DogDaysLitter } from "../finance/dogDays";
import {
  allocationsBalance,
  defaultSharedRecipients,
  headerBalance,
  resolveExpenseLineAllocations,
  toCents,
  type AllocationKind,
  type ResolvedAllocation,
} from "../finance/resolveAllocations";
import { lineTotal, type StockReceiptLineInput } from "./types";

export type ReceiptCosting =
  | { kind: "company" }
  | { kind: "shared" }
  | { kind: "dog"; dogId: string }
  | { kind: "litter"; litterId: string };

export type ConfirmLinePayload = {
  description: string;
  quantity: number;
  unit_amount: number;
  line_amount: number;
  vat_rate: number | null;
  vat_amount: number;
  allocation_kind: AllocationKind;
  sort_order: number;
  allocations: Array<{
    dog_id: string | null;
    litter_id: string | null;
    amount: number;
    weight: number;
    basis_note: string | null;
  }>;
};

export type ConfirmExpensePayload = {
  category_id: string | null;
  description: string;
  amount: number;
  expense_date: string;
  allocation_type: AllocationKind;
  dog_id: string | null;
  litter_id: string | null;
  price_excl_vat: number;
  vat_applicable: boolean;
  vat_rate: number;
  vat_amount: number;
  notes: string | null;
  lines: ConfirmLinePayload[];
};

export type BuiltConfirm = {
  payload: ConfirmExpensePayload;
  linesTotal: number;
  invoiceDifference: number;
  balanced: boolean;
};

function toAllocRows(allocations: ResolvedAllocation[]): ConfirmLinePayload["allocations"] {
  return allocations.map((a) => ({
    dog_id: a.dogId,
    litter_id: a.litterId,
    amount: a.amount,
    weight: a.weight,
    basis_note: a.basisNote,
  }));
}

export function costingError(costing: ReceiptCosting): string | null {
  if (costing.kind === "dog" && !costing.dogId) return "Pick the dog this delivery is for.";
  if (costing.kind === "litter" && !costing.litterId) return "Pick the litter this delivery is for.";
  return null;
}

export function buildConfirmExpense(input: {
  supplierName: string;
  invoiceNo: string | null;
  receivedOn: string;
  supplierInvoiceTotal: number;
  lines: Array<StockReceiptLineInput & { description?: string }>;
  costing: ReceiptCosting;
  categoryId: string | null;
  dogs: DogDaysDog[];
  litters: DogDaysLitter[];
}): BuiltConfirm {
  const costErr = costingError(input.costing);
  if (costErr) throw new Error(costErr);
  if (input.lines.length === 0) throw new Error("A receipt needs at least one line.");

  const kind: AllocationKind = input.costing.kind;
  const dogId = input.costing.kind === "dog" ? input.costing.dogId : null;
  const litterId = input.costing.kind === "litter" ? input.costing.litterId : null;
  const date = input.receivedOn.slice(0, 10);

  const sharedRecipients =
    kind === "shared"
      ? defaultSharedRecipients({
          invoiceDate: date,
          dogs: input.dogs,
          litters: input.litters,
          weighting: "weighted",
        })
      : [];
  if (kind === "shared" && sharedRecipients.length === 0) {
    throw new Error("No dogs were on hand that day, so this cannot be shared across the kennel.");
  }

  const lines: ConfirmLinePayload[] = input.lines.map((line, index) => {
    const amount = lineTotal(line.quantity, line.unit_cost);
    const allocations = resolveExpenseLineAllocations({
      kind,
      lineAmount: amount,
      invoiceDate: date,
      dogId,
      litterId,
      recipients: kind === "shared" ? sharedRecipients : undefined,
      weighting: "weighted",
    });
    if (
      kind !== "company" &&
      !allocationsBalance(amount, allocations.map((a) => a.amount))
    ) {
      throw new Error("Allocations did not sum to the line total.");
    }
    return {
      description: line.description || line.product_name || "Stock line",
      quantity: line.quantity,
      unit_amount: line.unit_cost,
      line_amount: amount,
      vat_rate: null,
      vat_amount: 0,
      allocation_kind: kind,
      sort_order: index,
      allocations: toAllocRows(allocations),
    };
  });

  const linesTotal = fromCentsExact(lines.reduce((sum, l) => sum + toCents(l.line_amount), 0));
  const header = headerBalance(linesTotal, lines.map((l) => l.line_amount));
  if (!header.ok) {
    throw new Error("Expense lines must sum to the receipt total.");
  }

  const invoiceDifference = fromCentsExact(
    toCents(input.supplierInvoiceTotal) - toCents(linesTotal),
  );

  return {
    payload: {
      category_id: input.categoryId,
      description: `Stock received — ${input.supplierName}`,
      amount: linesTotal,
      expense_date: date,
      allocation_type: kind,
      dog_id: dogId,
      litter_id: litterId,
      price_excl_vat: linesTotal,
      vat_applicable: false,
      vat_rate: 0,
      vat_amount: 0,
      notes: input.invoiceNo ? `Supplier invoice ${input.invoiceNo}` : null,
      lines,
    },
    linesTotal,
    invoiceDifference,
    balanced: invoiceDifference === 0,
  };
}

function fromCentsExact(cents: number): number {
  return cents / 100;
}
