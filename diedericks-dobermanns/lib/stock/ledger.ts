import { toCents, fromCents } from "../finance/resolveAllocations";
import type { PlannedMovement, StockMovement, StockMovementType } from "./types";

export const STOCK_WOULD_GO_NEGATIVE = "STOCK_WOULD_GO_NEGATIVE";

export function qtyOnHand(movements: Array<Pick<StockMovement, "quantity">>): number {
  return fromCents(movements.reduce((sum, m) => sum + toCents(Number(m.quantity)), 0));
}

export function needsReorder(onHand: number, reorderLevel: number): boolean {
  return onHand <= reorderLevel;
}

export function onHandValue(
  rows: Array<{ qty_on_hand: number; cost_price: number }>,
): number {
  return fromCents(
    rows.reduce((sum, r) => {
      const qty = Number(r.qty_on_hand);
      if (qty <= 0) return sum;
      return sum + toCents(qty * Number(r.cost_price));
    }, 0),
  );
}

export function wouldGoNegative(onHand: number, delta: number): boolean {
  return fromCents(toCents(onHand) + toCents(delta)) < 0;
}

export function signedQuantity(type: StockMovementType, absolute: number): number {
  const qty = Math.abs(absolute);
  if (type === "receive" || type === "return") return qty;
  if (type === "sale" || type === "write_off" || type === "internal_use") return -qty;
  return absolute;
}

export function applyMovements(
  opening: number,
  planned: Array<Pick<PlannedMovement, "quantity">>,
): number {
  return qtyOnHand([{ quantity: opening }, ...planned.map((p) => ({ quantity: p.quantity }))]);
}

export type SalePlan =
  | { ok: true; movements: PlannedMovement[]; resulting: number }
  | { ok: false; code: typeof STOCK_WOULD_GO_NEGATIVE; onHand: number; quantity: number };

/**
 * A sale is always a negative movement. If it would take qty below zero and
 * there is no override, it is blocked. An override writes a covering
 * adjustment (the missing units) then the sale, so the ledger shows why.
 */
export function planSale(input: {
  productId: string;
  onHand: number;
  quantity: number;
  unitCost: number | null;
  invoiceId: string;
  allowNegative?: boolean;
  reason?: string | null;
}): SalePlan {
  const need = Math.abs(input.quantity);
  if (!(need > 0)) {
    return { ok: true, movements: [], resulting: input.onHand };
  }
  const saleQty = -need;
  if (wouldGoNegative(input.onHand, saleQty) && !input.allowNegative) {
    return {
      ok: false,
      code: STOCK_WOULD_GO_NEGATIVE,
      onHand: input.onHand,
      quantity: need,
    };
  }
  const movements: PlannedMovement[] = [];
  if (wouldGoNegative(input.onHand, saleQty) && input.allowNegative) {
    movements.push({
      product_id: input.productId,
      movement_type: "adjustment",
      quantity: fromCents(toCents(need) - toCents(input.onHand)),
      unit_cost: input.unitCost,
      reason: input.reason?.trim() || "Override: sold more than on hand",
      invoice_id: input.invoiceId,
    });
  }
  movements.push({
    product_id: input.productId,
    movement_type: "sale",
    quantity: saleQty,
    unit_cost: input.unitCost,
    reason: input.reason?.trim() || "Invoice sale",
    invoice_id: input.invoiceId,
  });
  return {
    ok: true,
    movements,
    resulting: applyMovements(input.onHand, movements),
  };
}

export function assertReceiptEditable(status: string): void {
  if (status === "confirmed") {
    throw new Error("A confirmed receipt cannot be edited. Reverse it with a counter-receipt.");
  }
}

export function confirmReceiptOnce(input: {
  status: string;
  alreadyPosted: boolean;
  lines: Array<{ product_id: string; quantity: number; unit_cost: number }>;
}): PlannedMovement[] {
  if (input.status === "confirmed" || input.alreadyPosted) return [];
  assertReceiptEditable(input.status);
  return input.lines.map((line) => ({
    product_id: line.product_id,
    movement_type: "receive" as const,
    quantity: Math.abs(line.quantity),
    unit_cost: line.unit_cost,
    reason: "Goods received",
  }));
}
