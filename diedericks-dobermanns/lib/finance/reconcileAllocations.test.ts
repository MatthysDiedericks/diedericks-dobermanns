import assert from "node:assert/strict";

import {
  departedDogsLabel,
  exceptionListLabel,
  findAllocationsToDepartedDogs,
  reconcileExpenseAllocations,
  summarizeDepartedAllocations,
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
  assert.equal(report.departedDogs.lineCount, 0);

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
  assert.equal(companyOk.departedDogs.lineCount, 0);
  assert.equal(departedDogsLabel(companyOk.departedDogs), "0 lines, R 0.00");

  const departedRows = findAllocationsToDepartedDogs({
    lines: [line("shared", "shared", 100, { expenseDate: "2026-03-02" })],
    allocations: [
      { lineId: "shared", dogId: "sold-mar", amount: 40 },
      { lineId: "shared", dogId: "stayer", amount: 60 },
    ],
    dogs: [
      {
        id: "sold-mar",
        date_of_birth: "2022-01-01",
        ownership_status: "with_owner",
        ownership_status_at: "2026-03-01",
        deceased_at: null,
        outcome_date: null,
      },
      {
        id: "stayer",
        date_of_birth: "2022-01-01",
        ownership_status: "unknown",
        ownership_status_at: null,
        deceased_at: null,
        outcome_date: null,
      },
    ],
  });
  assert.equal(departedRows.length, 1);
  assert.equal(departedRows[0].dogId, "sold-mar");
  const departed = summarizeDepartedAllocations(departedRows);
  assert.equal(departed.lineCount, 1);
  assert.equal(departed.amount, 40);
  assert.equal(departedDogsLabel(departed), "1 line, R 40.00");

  const afterFix = findAllocationsToDepartedDogs({
    lines: [line("shared", "shared", 100, { expenseDate: "2026-03-02" })],
    allocations: [{ lineId: "shared", dogId: "stayer", amount: 100 }],
    dogs: [
      {
        id: "stayer",
        date_of_birth: "2022-01-01",
        ownership_status: "unknown",
        deceased_at: null,
      },
    ],
  });
  assert.equal(afterFix.length, 0);
  assert.equal(summarizeDepartedAllocations(afterFix).lineCount, 0);

  console.log("reconcileAllocations.test.ts ok");
}

main();
