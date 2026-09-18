import assert from "node:assert/strict";

import type { DogDaysDog, DogDaysLitter } from "./dogDays";
import {
  exceptionReasonLabel,
  planSharedAllocationBackfill,
} from "./backfillSharedAllocations";
import { allocationsBalance, toCents } from "./resolveAllocations";

/** Run: npx tsx lib/finance/backfillSharedAllocations.test.ts */

const CLAIRE = "claire-dam";
const PUP = "pup-1";
const LITTER = "11111111-1111-4111-8111-111111111001";

function adult(id: string, patch: Partial<DogDaysDog> = {}): DogDaysDog {
  return {
    id,
    date_of_birth: "2022-01-01",
    status: "keep",
    deceased_at: null,
    litter_id: null,
    category: "breeding_stock",
    ...patch,
  };
}

function main() {
  const dogs: DogDaysDog[] = [
    adult(CLAIRE),
    {
      id: PUP,
      date_of_birth: "2026-07-10",
      status: "available",
      deceased_at: null,
      litter_id: LITTER,
      outcome: "live",
      category: "puppy",
    },
  ];
  const litters: DogDaysLitter[] = [
    {
      id: LITTER,
      actual_date: "2026-07-10",
      go_home_date: "2026-09-04",
      mother_id: CLAIRE,
    },
  ];

  const dated = {
    id: "line-ok",
    lineAmount: 150,
    expenseDate: "2026-08-28",
    description: "Dog food",
    supplierName: "Agrimark",
    invoiceReference: "17702",
  };
  const already = {
    id: "line-done",
    lineAmount: 40,
    expenseDate: "2026-08-28",
    description: "Already split",
    supplierName: null,
    invoiceReference: null,
  };
  const prehistoric = {
    id: "line-old",
    lineAmount: 99,
    expenseDate: "2018-01-01",
    description: "Before records",
    supplierName: "Old supplier",
    invoiceReference: "PRE-1",
  };

  const plan = planSharedAllocationBackfill({
    lines: [dated, already, prehistoric],
    allocatedLineIds: [already.id],
    dogs,
    litters,
    settings: { puppyWeight: 0.5, nursingMultiplier: 2 },
  });

  assert.equal(plan.skippedAlreadyAllocated, 1);
  assert.equal(plan.resolved.length, 1);
  assert.equal(plan.resolved[0].id, dated.id);
  assert.equal(plan.exceptions.length, 1);
  assert.equal(plan.exceptions[0].line.id, prehistoric.id);
  assert.equal(plan.exceptions[0].reason, "before_first_dog");
  assert.match(exceptionReasonLabel("before_first_dog"), /before the first recorded dog/);
  assert.equal(plan.totalValueCovered, 150);
  assert.ok(plan.allocationsToCreate >= 2);
  assert.ok(
    allocationsBalance(
      150,
      plan.toInsert
        .filter((r) => r.expense_line_id === dated.id)
        .map((r) => r.amount),
    ),
  );
  const claire = plan.toInsert.find((r) => r.dog_id === CLAIRE);
  const pup = plan.toInsert.find((r) => r.dog_id === PUP);
  assert.equal(claire?.weight, 2);
  assert.equal(pup?.weight, 0.5);
  assert.equal(claire?.amount, 120);
  assert.equal(pup?.amount, 30);
  assert.equal(
    claire?.basis_note,
    "2 active dogs on 28 Aug 2026, weighted by age",
  );
  assert.equal(
    plan.toInsert.reduce((s, r) => s + toCents(r.amount), 0),
    toCents(150),
  );
  assert.equal(plan.toInsert.some((r) => r.expense_line_id === already.id), false);

  const emptyDay = planSharedAllocationBackfill({
    lines: [
      {
        id: "line-empty",
        lineAmount: 10,
        expenseDate: "2021-06-01",
        description: "Gap",
        supplierName: null,
        invoiceReference: null,
      },
    ],
    allocatedLineIds: [],
    dogs: [
      adult("sold-before", {
        date_of_birth: "2020-01-01",
        status: "sold",
        handover_date: "2021-01-01",
      }),
    ],
    litters: [],
  });
  assert.equal(emptyDay.resolved.length, 0);
  assert.equal(emptyDay.exceptions[0].reason, "no_dogs_on_date");
  assert.equal(emptyDay.toInsert.length, 0);

  console.log("backfillSharedAllocations.test.ts ok");
}

main();
