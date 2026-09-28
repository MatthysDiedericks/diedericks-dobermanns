import assert from "node:assert/strict";

import type { DogDaysDog, DogDaysLitter } from "../finance/dogDays";
import { allocationsBalance, headerBalance, toCents } from "../finance/resolveAllocations";
import { buildConfirmExpense } from "./confirmReceipt";

/** Run: npx tsx src/lib/stock/confirmReceipt.test.ts */

const INVOICE_DATE = "2026-09-18";

function adult(id: string): DogDaysDog {
  return {
    id,
    date_of_birth: "2022-01-01",
    status: "keep",
    deceased_at: null,
    litter_id: null,
    category: "breeding_stock",
  };
}

function main() {
  const dogs = Array.from({ length: 8 }, (_, i) => adult(`dog-${i + 1}`));
  const litters: DogDaysLitter[] = [];

  const built = buildConfirmExpense({
    supplierName: "Agrimark Worcester",
    invoiceNo: "AG-4412",
    receivedOn: INVOICE_DATE,
    supplierInvoiceTotal: 4320,
    costing: { kind: "shared" },
    categoryId: "cat-feed",
    dogs,
    litters,
    lines: [
      { product_id: "kibble", product_name: "Adult kibble 20kg", quantity: 6, unit_cost: 540 },
      { product_id: "collar", product_name: "Leather collar", quantity: 4, unit_cost: 180 },
      { product_id: "lead", product_name: "Training lead", quantity: 4, unit_cost: 90 },
    ],
  });

  assert.equal(built.linesTotal, 4320);
  assert.equal(built.invoiceDifference, 0);
  assert.equal(built.balanced, true);
  assert.equal(built.payload.amount, 4320);
  assert.equal(built.payload.lines.length, 3);

  const header = headerBalance(
    built.payload.amount,
    built.payload.lines.map((l) => l.line_amount),
  );
  assert.equal(header.ok, true);
  assert.equal(header.difference, 0);

  let allocCents = 0;
  for (const line of built.payload.lines) {
    assert.ok(
      allocationsBalance(
        line.line_amount,
        line.allocations.map((a) => a.amount),
      ),
      `line ${line.description} allocations must sum to the line`,
    );
    allocCents += line.allocations.reduce((sum, a) => sum + toCents(a.amount), 0);
  }
  assert.equal(allocCents, toCents(4320));
  assert.equal(built.payload.allocation_type, "shared");
  assert.ok(built.payload.lines[0]!.allocations.length >= 8);

  const company = buildConfirmExpense({
    supplierName: "Cape K9 Gear",
    invoiceNo: "CK-19",
    receivedOn: INVOICE_DATE,
    supplierInvoiceTotal: 900,
    costing: { kind: "company" },
    categoryId: null,
    dogs,
    litters,
    lines: [{ product_id: "hoodie", product_name: "Staff hoodie", quantity: 3, unit_cost: 300 }],
  });
  assert.equal(company.payload.lines[0]!.allocations.length, 0);
  assert.equal(company.payload.amount, 900);

  const mismatched = buildConfirmExpense({
    supplierName: "Agrimark Worcester",
    invoiceNo: "AG-4412",
    receivedOn: INVOICE_DATE,
    supplierInvoiceTotal: 4300,
    costing: { kind: "company" },
    categoryId: null,
    dogs,
    litters,
    lines: [
      { product_id: "kibble", quantity: 6, unit_cost: 540 },
      { product_id: "collar", quantity: 4, unit_cost: 180 },
      { product_id: "lead", quantity: 4, unit_cost: 90 },
    ],
  });
  assert.equal(mismatched.linesTotal, 4320);
  assert.equal(mismatched.invoiceDifference, -20);
  assert.equal(mismatched.balanced, false);

  console.log("confirmReceipt.test.ts ok");
  console.log("Worked receive — 3 lines, R4,320.00, allocations to the cent");
}

main();
