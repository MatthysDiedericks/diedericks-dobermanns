import assert from "node:assert/strict";

import {
  buildDogProfitability,
  formatMoneyFigure,
  profitColumnLabels,
  puppyIncomeCoverage,
  type ProfitInput,
  type ProfitPuppy,
} from "./dogProfitability";
import { shortlistSaleCandidates, type CandidateDog } from "./saleCandidates";
import { stampAction } from "./stampSaleDog";
import { soldDogsProgressLabel, summarizeIncomeLinks } from "./incomeLinks";

/** Run: npx tsx src/lib/finance/dogProfitability.test.ts */

function puppy(id: string, patch: Partial<ProfitPuppy> = {}): ProfitPuppy {
  return {
    id,
    name: id,
    status: "sold",
    litterId: "litter-1",
    deceasedAt: null,
    motherId: "dam",
    fatherId: null,
    ...patch,
  };
}

function base(patch: Partial<ProfitInput> = {}): ProfitInput {
  return {
    dog: { id: "dam", name: "Cendra", status: "keep" },
    litters: [
      {
        id: "litter-1",
        name: "C litter",
        motherId: "dam",
        fatherId: "sire",
        whelpDate: "2024-01-01",
      },
    ],
    puppies: [],
    invoices: [],
    historical: [],
    allocations: [],
    purchaseAmount: null,
    ...patch,
  };
}

function main() {
  const unlinked = buildDogProfitability(
    base({
      puppies: [puppy("p1"), puppy("p2")],
      allocations: [
        {
          id: "a1",
          dogId: "dam",
          litterId: null,
          amount: 500,
          kind: "dog",
          date: "2024-02-01",
          description: "Vet",
          basisNote: "this dog",
          supplier: "Vet",
        },
        {
          id: "a2",
          dogId: null,
          litterId: "litter-1",
          amount: 800,
          kind: "litter",
          date: "2024-02-01",
          description: "Food",
          basisNote: "litter",
          supplier: null,
        },
      ],
    }),
  );
  assert.equal(unlinked.attributed?.income.kind, "not_linked");
  assert.equal(formatMoneyFigure(unlinked.attributed!.income, (n) => `R${n}`), "Not yet linked");
  assert.equal(unlinked.attributed?.net.kind, "not_linked");
  assert.equal(unlinked.direct.costs, 500);
  assert.equal(unlinked.attributed?.litterCosts, 800);
  assert.match(unlinked.coverage, /0 of 2 puppies sold/);
  assert.equal("profit" in unlinked, false);
  assert.equal("total" in unlinked, false);
  const labels = profitColumnLabels(unlinked);
  assert.deepEqual(labels.direct, ["Bought for", "Sold for", "Costs allocated to this dog"]);
  assert.ok(labels.attributed.includes("Invoiced"));
  assert.ok(labels.attributed.includes("Received"));
  assert.ok(labels.attributed.includes("Outstanding"));
  assert.ok(!labels.direct.includes("Profit"));
  assert.ok(!labels.attributed.includes("Profit"));
  assert.notEqual(
    labels.direct.join("|") + labels.attributed.join("|"),
    "Profit",
  );

  const pups = Array.from({ length: 9 }, (_, i) => puppy(`p${i}`));
  const linked = buildDogProfitability(
    base({
      puppies: pups,
      invoices: [0, 1, 2].map((i) => ({
        id: `inv-${i}`,
        dogId: `p${i}`,
        issueDate: "2025-03-01",
        total: 1000 * (i + 1),
        buyer: "Buyer",
        status: "paid",
        number: `DD-${i}`,
        historicalIncomeId: null,
      })),
    }),
  );
  assert.equal(linked.attributed?.income.kind, "amount");
  if (linked.attributed?.income.kind === "amount") {
    assert.equal(linked.attributed.income.amount, 6000);
  }
  assert.equal(
    puppyIncomeCoverage(3, 9),
    "Income from 3 of 9 puppies sold — 6 not yet linked",
  );
  assert.equal(linked.coverage, "Income from 3 of 9 puppies sold — 6 not yet linked");
  assert.equal(linked.attributed?.netLabel, "Net of linked income (on money received)");
  if (linked.attributed?.received.kind === "amount") {
    assert.equal(linked.attributed.received.amount, 6000);
  }
  assert.equal(linked.attributed?.net.kind, "amount");
  assert.equal(linked.litterBreakdown[0]?.linkedSales, 3);
  assert.equal(linked.litterBreakdown[0]?.sold, 9);

  const solo = buildDogProfitability(
    base({
      dog: { id: "solo", name: "Solo", status: "sold" },
      litters: [],
      puppies: [],
    }),
  );
  assert.equal(solo.attributed, null);
  assert.equal(solo.direct.sold.kind, "not_linked");
  assert.equal(formatMoneyFigure(solo.direct.sold, () => "R0"), "Not yet linked");
  assert.equal(solo.litterBreakdown.length, 0);

  const noLitterPuppy = buildDogProfitability(
    base({
      puppies: [puppy("loose", { litterId: null, name: "Loose" })],
    }),
  );
  assert.equal(noLitterPuppy.litterBreakdown.some((row) => row.label === "No litter on file"), true);

  const doubled = buildDogProfitability(
    base({
      puppies: [puppy("p1")],
      invoices: [
        {
          id: "inv",
          dogId: "p1",
          issueDate: "2025-01-01",
          total: 4000,
          buyer: "A",
          status: "paid",
          number: "1",
          historicalIncomeId: "hist-1",
        },
      ],
      historical: [
        {
          id: "hist-1",
          dogId: "p1",
          date: "2025-01-01",
          total: 4000,
          buyer: "A",
          description: "same sale",
          number: "1",
        },
      ],
    }),
  );
  if (doubled.attributed?.income.kind === "amount") {
    assert.equal(doubled.attributed.income.amount, 4000);
  } else {
    assert.fail("expected linked income");
  }

  const summary = summarizeIncomeLinks({
    invoices: [
      { id: "1", dogId: null, status: "paid", total: 100 },
      { id: "2", dogId: "sold-1", status: "paid", total: 50 },
      { id: "3", dogId: null, status: "void", total: 999 },
    ],
    historicalDogIds: [null],
    soldDogIds: ["sold-1", "sold-2"],
  });
  assert.equal(summary.unlinkedInvoices, 1);
  assert.equal(summary.unlinkedAmount, 100);
  assert.equal(summary.soldDogsLinked, 1);
  assert.equal(summary.soldDogsWithoutIncome, 1);
  assert.equal(soldDogsProgressLabel(1, 2), "1 of 2 sold dogs linked");

  const dogs: CandidateDog[] = [
    {
      id: "near",
      name: "Near",
      status: "sold",
      dateOfBirth: "2024-01-01",
      placementDate: "2024-03-01",
      handoverDate: null,
      deliveredAt: null,
      litterId: "l",
      litterName: "L",
      litterWhelp: "2024-01-01",
      linked: false,
    },
    {
      id: "none",
      name: "No litter",
      status: "sold",
      dateOfBirth: "2024-02-01",
      placementDate: null,
      handoverDate: null,
      deliveredAt: null,
      litterId: null,
      litterName: null,
      litterWhelp: null,
      linked: false,
    },
    {
      id: "future",
      name: "Future litter",
      status: "sold",
      dateOfBirth: "2026-01-01",
      placementDate: "2026-03-01",
      handoverDate: null,
      deliveredAt: null,
      litterId: "later",
      litterName: "Later",
      litterWhelp: "2026-01-01",
      linked: false,
    },
  ];
  const short = shortlistSaleCandidates("2024-04-01", dogs);
  assert.ok(short.some((dog) => dog.id === "none"));
  assert.equal(short.some((dog) => dog.id === "future"), false);
  assert.equal(short[0]?.id, "near");

  assert.equal(stampAction(null, "dog"), "set");
  assert.equal(stampAction("dog", "dog"), "already");
  assert.equal(stampAction("other", "dog"), "refuse");

  const litterOnly = buildDogProfitability(
    base({
      puppies: [puppy("p1"), puppy("p2")],
      invoices: [
        {
          id: "litter-inv",
          dogId: null,
          litterId: "litter-1",
          issueDate: "2024-04-01",
          total: 18000,
          buyer: "Buyer",
          status: "paid",
          number: "L",
          historicalIncomeId: null,
        },
      ],
    }),
  );
  assert.equal(litterOnly.attributed?.income.kind, "amount");
  if (litterOnly.attributed?.income.kind === "amount") {
    assert.equal(litterOnly.attributed.income.amount, 18000);
  }
  assert.equal(
    litterOnly.coverage,
    "Income linked to 1 of 1 litter — not split across 2 puppies sold",
  );
  assert.equal("profit" in litterOnly, false);

  const deposit = buildDogProfitability(
    base({
      puppies: [puppy("bruce")],
      invoices: [
        {
          id: "1087",
          dogId: "bruce",
          issueDate: "2026-06-09",
          total: 55000,
          paid: 10000,
          buyer: "Gerhard Nagel",
          status: "partially_paid",
          number: "1087",
          historicalIncomeId: null,
        },
      ],
      allocations: [
        {
          id: "food",
          dogId: null,
          litterId: "litter-1",
          amount: 1830.4,
          kind: "litter",
          date: "2026-06-01",
          description: "Food",
          basisNote: null,
          supplier: null,
        },
      ],
    }),
  );
  assert.equal(deposit.attributed?.invoiced.kind, "amount");
  assert.equal(deposit.attributed?.received.kind, "amount");
  if (deposit.attributed?.invoiced.kind === "amount" && deposit.attributed.received.kind === "amount") {
    assert.equal(deposit.attributed.invoiced.amount, 55000);
    assert.equal(deposit.attributed.received.amount, 10000);
  }
  if (deposit.attributed?.outstanding.kind === "amount") {
    assert.equal(deposit.attributed.outstanding.amount, 45000);
  }
  if (deposit.attributed?.net.kind === "amount") {
    assert.equal(deposit.attributed.net.amount, 8169.6);
  }
  assert.equal(deposit.litterBreakdown[0]?.net.kind, "amount");

  const litterLinkedInvoice = summarizeIncomeLinks({
    invoices: [
      { id: "1", dogId: null, litterId: "litter-1", status: "paid", total: 18000 },
      { id: "2", dogId: null, status: "paid", total: 40 },
    ],
    historicalDogIds: [],
    soldDogIds: ["sold-1"],
  });
  assert.equal(litterLinkedInvoice.unlinkedInvoices, 1);
  assert.equal(litterLinkedInvoice.unlinkedAmount, 40);

  console.log("dogProfitability tests passed");
}

main();
