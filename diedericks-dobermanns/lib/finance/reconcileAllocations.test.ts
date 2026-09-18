import assert from "node:assert/strict";

import {
  exceptionListLabel,
  reconcileExpenseAllocations,
  type ReconcileLine,
} from "./reconcileAllocations";
import { toCents } from "./resolveAllocations";

/** Run: npx tsx lib/finance/reconcileAllocations.test.ts */

function line(
  id: string,
  kind: ReconcileLine["kind"],
  amount: number,
  patch: Partial<ReconcileLine> = {},
): ReconcileLine {
  return {
    id,
    expenseId: `e-${id}`,
    expenseDate: "2026-08-28",
    description: id,
    supplierName: "Agrimark",
    invoiceReference: "17702",
    kind,
    lineAmount: amount,
    ...patch,
  };
}

function main() {
  const lines = [
    line("company", "company", 550),
    line("dog", "dog", 1450),
    line("litter", "litter", 1680),
    line("shared", "shared", 11200),
    line("old", "shared", 99, {
      expenseDate: "2018-01-01",
      description: "Before records",
    }),
  ];
  const allocated = new Map<string, number>([
    ["dog", toCents(1450)],
    ["litter", toCents(1680)],
    ["shared", toCents(11200)],
  ]);

  const report = reconcileExpenseAllocations({
    lines,
    allocatedCentsByLineId: allocated,
    headerTotal: 14979,
  });

  assert.equal(report.byKind.company, 550);
  assert.equal(report.byKind.dog, 1450);
  assert.equal(report.byKind.litter, 1680);
  assert.equal(report.byKind.shared, 11299);
  assert.equal(report.total, 14979);
  assert.equal(
    report.byKind.company +
      report.byKind.dog +
      report.byKind.litter +
      report.byKind.shared,
    report.total,
  );
  assert.equal(report.linesMatchHeader, true);
  assert.equal(report.exceptions.length, 1);
  assert.equal(report.exceptions[0].lineId, "old");
  assert.equal(report.exceptions[0].reason, "no_allocation");
  assert.equal(exceptionListLabel(report.exceptions[0]), "no stored split");

  const mismatch = reconcileExpenseAllocations({
    lines: [line("shared", "shared", 100)],
    allocatedCentsByLineId: new Map([["shared", toCents(99.5)]]),
  });
  assert.equal(mismatch.exceptions[0].reason, "sum_mismatch");

  const companyOk = reconcileExpenseAllocations({
    lines: [line("company", "company", 550)],
    allocatedCentsByLineId: new Map(),
  });
  assert.equal(companyOk.exceptions.length, 0);

  console.log("reconcileAllocations.test.ts ok");
}

main();
