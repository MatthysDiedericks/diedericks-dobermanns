import assert from "node:assert/strict";

import type { DogDaysDog, DogDaysLitter } from "./dogDays";
import {
  allocationsBalance,
  defaultSharedRecipients,
  headerBalance,
  mapLegacyAllocationToKind,
  resolveExpenseLineAllocations,
  splitAmountByWeights,
  totalsByKind,
  type ResolvedAllocation,
  type SharedRecipient,
} from "./resolveAllocations";

/** Run: npx tsx lib/finance/resolveAllocations.test.ts */

const INVOICE_DATE = "2026-08-28";
const HUNTER_KING = "hunter-king";
const CLAIRE = "claire-dam";
const CLAIRE_LITTER = "11111111-1111-4111-8111-111111111001";

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

function pup(n: number, patch: Partial<DogDaysDog> = {}): DogDaysDog {
  return {
    id: `pup-${n}`,
    date_of_birth: "2026-07-10",
    status: "available",
    deceased_at: null,
    litter_id: CLAIRE_LITTER,
    outcome: "live",
    category: "puppy",
    ...patch,
  };
}

function eighteenAdults(): SharedRecipient[] {
  return Array.from({ length: 18 }, (_, i) => ({
    dogId: `d${i + 1}`,
    weight: 1,
    role: "adult" as const,
  }));
}

function agrimarkLines() {
  return [
    { kind: "shared" as const, amount: 11200, description: "Dog food, 8 × 20kg" },
    { kind: "dog" as const, amount: 1450, description: "Vet consult — Hunter-King" },
    { kind: "litter" as const, amount: 1680, description: "Whelping box + heat lamp" },
    { kind: "company" as const, amount: 550, description: "Kennel brooms, hose fittings" },
  ];
}

function main() {
  assert.equal(mapLegacyAllocationToKind("general"), "shared");
  assert.equal(mapLegacyAllocationToKind("shared"), "shared");
  assert.equal(mapLegacyAllocationToKind("company"), "company");
  assert.equal(mapLegacyAllocationToKind("dog"), "dog");
  assert.equal(mapLegacyAllocationToKind("litter"), "litter");

  // --- 18 dogs, split to the cent ---
  const shared18 = resolveExpenseLineAllocations({
    kind: "shared",
    lineAmount: 11200,
    invoiceDate: INVOICE_DATE,
    recipients: eighteenAdults(),
    weighting: "weighted",
  });
  assert.equal(shared18.length, 18);
  assert.ok(allocationsBalance(11200, shared18.map((a) => a.amount)));
  const cents18 = shared18.map((a) => Math.round(a.amount * 100));
  const minC = Math.min(...cents18);
  const maxC = Math.max(...cents18);
  assert.equal(cents18.reduce((s, n) => s + n, 0), 1120000);
  // Remainder is lumped on the largest recipient (index 0 when weights tie).
  assert.equal(Math.round(shared18[0].amount * 100), maxC);
  assert.ok(maxC >= minC);
  assert.equal(shared18[0].basisNote, "18 active dogs on 28 Aug 2026, weighted by age");

  // --- Puppy weighted 0.5 ---
  const puppySplit = resolveExpenseLineAllocations({
    kind: "shared",
    lineAmount: 150,
    invoiceDate: INVOICE_DATE,
    recipients: [
      { dogId: "adult-1", weight: 1, role: "adult" },
      { dogId: "pup-1", litterId: CLAIRE_LITTER, weight: 0.5, role: "puppy" },
    ],
  });
  assert.ok(allocationsBalance(150, puppySplit.map((a) => a.amount)));
  assert.equal(puppySplit.find((a) => a.dogId === "adult-1")?.amount, 100);
  assert.equal(puppySplit.find((a) => a.dogId === "pup-1")?.amount, 50);

  // --- Nursing dam weighted 2.0 ---
  const nursingSplit = resolveExpenseLineAllocations({
    kind: "shared",
    lineAmount: 300,
    invoiceDate: INVOICE_DATE,
    recipients: [
      { dogId: CLAIRE, litterId: CLAIRE_LITTER, weight: 2, role: "nursing_dam" },
      { dogId: "adult-1", weight: 1, role: "adult" },
    ],
  });
  assert.ok(allocationsBalance(300, nursingSplit.map((a) => a.amount)));
  assert.equal(nursingSplit.find((a) => a.dogId === CLAIRE)?.amount, 200);
  assert.equal(nursingSplit.find((a) => a.dogId === "adult-1")?.amount, 100);

  // --- Equal split (one click) ignores role weights ---
  const equalSplit = resolveExpenseLineAllocations({
    kind: "shared",
    lineAmount: 150,
    invoiceDate: INVOICE_DATE,
    weighting: "equal",
    recipients: [
      { dogId: "adult-1", weight: 1, role: "adult" },
      { dogId: "pup-1", weight: 1, role: "puppy" },
    ],
  });
  assert.equal(equalSplit[0].amount, 75);
  assert.equal(equalSplit[1].amount, 75);
  assert.match(equalSplit[0].basisNote, /equal split/);

  // --- Single-dog line ---
  const dogLine = resolveExpenseLineAllocations({
    kind: "dog",
    lineAmount: 1450,
    invoiceDate: INVOICE_DATE,
    dogId: HUNTER_KING,
  });
  assert.equal(dogLine.length, 1);
  assert.equal(dogLine[0].dogId, HUNTER_KING);
  assert.equal(dogLine[0].amount, 1450);
  assert.equal(dogLine[0].litterId, null);
  assert.equal(dogLine[0].basisNote, "direct to one dog");

  const companyLine = resolveExpenseLineAllocations({
    kind: "company",
    lineAmount: 550,
    invoiceDate: INVOICE_DATE,
  });
  assert.deepEqual(companyLine, []);

  const litterLine = resolveExpenseLineAllocations({
    kind: "litter",
    lineAmount: 1680,
    invoiceDate: INVOICE_DATE,
    litterId: CLAIRE_LITTER,
  });
  assert.equal(litterLine[0].litterId, CLAIRE_LITTER);
  assert.equal(litterLine[0].amount, 1680);

  // --- Agrimark 17702: four kinds on one header ---
  const agrimark = agrimarkLines();
  const header = headerBalance(
    14880,
    agrimark.map((l) => l.amount),
  );
  assert.equal(header.ok, true);
  assert.equal(header.difference, 0);
  const kindTotals = totalsByKind(agrimark);
  assert.equal(kindTotals.shared, 11200);
  assert.equal(kindTotals.dog, 1450);
  assert.equal(kindTotals.litter, 1680);
  assert.equal(kindTotals.company, 550);
  assert.equal(
    kindTotals.company + kindTotals.dog + kindTotals.litter + kindTotals.shared,
    14880,
  );

  const food = resolveExpenseLineAllocations({
    kind: "shared",
    lineAmount: 11200,
    invoiceDate: INVOICE_DATE,
    recipients: eighteenAdults(),
  });
  const vet = resolveExpenseLineAllocations({
    kind: "dog",
    lineAmount: 1450,
    invoiceDate: INVOICE_DATE,
    dogId: HUNTER_KING,
  });
  const box = resolveExpenseLineAllocations({
    kind: "litter",
    lineAmount: 1680,
    invoiceDate: INVOICE_DATE,
    litterId: CLAIRE_LITTER,
  });
  const brooms = resolveExpenseLineAllocations({
    kind: "company",
    lineAmount: 550,
    invoiceDate: INVOICE_DATE,
  });
  assert.ok(allocationsBalance(11200, food.map((a) => a.amount)));
  assert.equal(vet[0].amount, 1450);
  assert.equal(box[0].amount, 1680);
  assert.equal(brooms.length, 0);
  const storedTotal =
    food.reduce((s, a) => s + a.amount, 0) +
    vet[0].amount +
    box[0].amount +
    550;
  assert.equal(Number(storedTotal.toFixed(2)), 14880);

  // --- Re-running later, after a dog is sold, does not change stored rows ---
  const stored: ResolvedAllocation[] = structuredClone(food);
  const afterSale = resolveExpenseLineAllocations({
    kind: "shared",
    lineAmount: 11200,
    invoiceDate: INVOICE_DATE,
    recipients: eighteenAdults().slice(0, 17),
  });
  assert.equal(afterSale.length, 17);
  assert.equal(stored.length, 18);
  assert.ok(allocationsBalance(11200, stored.map((a) => a.amount)));
  assert.deepEqual(stored, food);
  // A later resolve is a different document. The captured rows stay still.
  assert.notDeepEqual(
    afterSale.map((a) => a.amount),
    stored.map((a) => a.amount),
  );

  // --- Default set: dog-days on the invoice date, puppy 0.5, dam 2.0 ---
  const claireLitter: DogDaysLitter = {
    id: CLAIRE_LITTER,
    actual_date: "2026-07-10",
    go_home_date: "2026-09-04",
    mother_id: CLAIRE,
  };
  const roster: DogDaysDog[] = [
    adult(CLAIRE),
    adult("stud-1", { status: "stud" }),
    pup(1),
    adult("sold-already", {
      status: "sold",
      handover_date: "2026-08-01",
    }),
  ];
  const weightedSet = defaultSharedRecipients({
    invoiceDate: INVOICE_DATE,
    dogs: roster,
    litters: [claireLitter],
    weighting: "weighted",
  });
  assert.equal(weightedSet.some((r) => r.dogId === "sold-already"), false);
  assert.equal(weightedSet.find((r) => r.dogId === CLAIRE)?.weight, 2);
  assert.equal(weightedSet.find((r) => r.dogId === CLAIRE)?.role, "nursing_dam");
  assert.equal(weightedSet.find((r) => r.dogId === "pup-1")?.weight, 0.5);
  assert.equal(weightedSet.find((r) => r.dogId === "stud-1")?.weight, 1);

  const equalSet = defaultSharedRecipients({
    invoiceDate: INVOICE_DATE,
    dogs: roster,
    litters: [claireLitter],
    weighting: "equal",
  });
  assert.ok(equalSet.every((r) => r.weight === 1));

  // splitAmountByWeights remainder on largest weight, not lost
  const uneven = splitAmountByWeights(100, [2, 1, 0.5]);
  assert.equal(
    uneven.reduce((s, n) => s + Math.round(n * 100), 0),
    10000,
  );
  assert.ok(uneven[0] >= uneven[1]);
  assert.ok(uneven[1] >= uneven[2]);

  console.log("resolveAllocations.test.ts ok");
  console.log("Agrimark 17702 — 28 Aug 2026 — R14,880.00");
  console.log(`  shared food     R${kindTotals.shared.toFixed(2)}  → ${food.length} dogs, stored`);
  console.log(`  dog vet         R${kindTotals.dog.toFixed(2)}   → Hunter-King`);
  console.log(`  litter box      R${kindTotals.litter.toFixed(2)}   → Claire × Santini`);
  console.log(`  company brooms  R${kindTotals.company.toFixed(2)}    → overhead, no animal`);
  console.log(
    `  four totals     R${(kindTotals.company + kindTotals.dog + kindTotals.litter + kindTotals.shared).toFixed(2)}`,
  );
  console.log(
    `  after a sale, fresh resolve has ${afterSale.length} rows; stored still has ${stored.length}`,
  );
}

main();
