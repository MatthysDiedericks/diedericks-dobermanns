import assert from "node:assert/strict";

import {
  buildDamLifetimes,
  buildDamSeries,
  buildLitterLeague,
  excludedDamNote,
  nameMatchSummary,
  programmeCoverage,
  suggestExactNameLinks,
  type LitterReportInput,
} from "./litterReport";

/** Run: npx tsx src/lib/finance/litterReport.test.ts */

function input(patch: Partial<LitterReportInput> = {}): LitterReportInput {
  return {
    litters: [
      {
        id: "cyrus-litter",
        name: "Cyrus litter",
        damId: "cyrus",
        damName: "Cyrus",
        sireName: "Sire",
        whelpDate: "2020-03-01",
      },
      {
        id: "cendra-litter",
        name: "Cendra × Dharka",
        damId: "cendra",
        damName: "Cendra",
        sireName: "Dharka",
        whelpDate: "2026-06-01",
      },
    ],
    puppies: [
      {
        id: "cyrus-pup",
        name: "Pup",
        status: "sold",
        litterId: "cyrus-litter",
        buyerName: "Someone",
      },
      {
        id: "cendra-pup",
        name: "Bruce",
        status: "sold",
        litterId: "cendra-litter",
        buyerName: "Gerhard Nagel",
      },
    ],
    invoices: [
      {
        id: "inv-cendra",
        dogId: "cendra-pup",
        litterId: null,
        issueDate: "2026-06-09",
        total: 55000,
        paid: 55000,
        status: "paid",
        number: "1087",
        clientName: "Gerhard Nagel",
        historicalIncomeId: null,
      },
    ],
    historical: [],
    allocations: [
      {
        id: "a1",
        litterId: "cendra-litter",
        dogId: null,
        amount: 1830.4,
        date: "2026-06-02",
        description: "Food",
        kind: "litter",
      },
    ],
    ...patch,
  };
}

function main() {
  const rows = buildLitterLeague(input());
  const cyrus = rows.find((row) => row.litterId === "cyrus-litter");
  const cendra = rows.find((row) => row.litterId === "cendra-litter");
  assert.equal(cyrus?.invoiced.kind, "not_linked");
  assert.equal(cyrus?.received.kind, "not_linked");
  assert.equal(cyrus?.net.kind, "not_linked");
  assert.equal(cyrus?.netPerPuppy.kind, "not_linked");
  assert.match(cyrus?.coverage ?? "", /0 of 1/);
  assert.equal(cendra?.invoiced.kind, "amount");
  if (cendra?.received.kind === "amount") assert.equal(cendra.received.amount, 55000);
  assert.equal(cendra?.cost, 1830.4);
  if (cendra?.net.kind === "amount") assert.equal(cendra.net.amount, 53169.6);

  const dams = buildDamLifetimes(rows);
  const cyrusDam = dams.find((dam) => dam.damName === "Cyrus");
  assert.equal(cyrusDam?.received.kind, "not_linked");
  assert.equal(cyrusDam?.chart, "excluded");
  const series = buildDamSeries(rows, dams);
  assert.equal(series.some((line) => line.damName === "Cyrus"), false);
  assert.match(excludedDamNote(dams), /Cyrus/);
  assert.equal(series.some((line) => line.damName === "Cendra"), true);

  const partial = buildLitterLeague(
    input({
      invoices: [
        {
          id: "inv-cendra",
          dogId: "cendra-pup",
          litterId: null,
          issueDate: "2026-06-09",
          total: 55000,
          paid: 10000,
          status: "partially_paid",
          number: "1087",
          clientName: "Gerhard Nagel",
          historicalIncomeId: null,
        },
      ],
    }),
  );
  const deposited = partial.find((row) => row.litterId === "cendra-litter");
  if (deposited?.net.kind === "amount") assert.equal(deposited.net.amount, 8169.6);
  if (deposited?.outstanding.kind === "amount") assert.equal(deposited.outstanding.amount, 45000);

  const coverage = programmeCoverage(rows);
  assert.match(coverage.text, /1 of 2 sold puppies/);

  const suggestions = suggestExactNameLinks(
    input({
      invoices: [
        {
          id: "open",
          dogId: null,
          litterId: null,
          issueDate: "2024-01-01",
          total: 40000,
          paid: 40000,
          status: "paid",
          number: "100",
          clientName: "someone",
          historicalIncomeId: null,
        },
        {
          id: "inv-cendra",
          dogId: "cendra-pup",
          litterId: null,
          issueDate: "2026-06-09",
          total: 55000,
          paid: 55000,
          status: "paid",
          number: "1087",
          clientName: "Gerhard Nagel",
          historicalIncomeId: null,
        },
      ],
    }),
  );
  assert.equal(suggestions.length, 1);
  assert.equal(suggestions[0]?.dogId, "cyrus-pup");
  assert.equal(suggestions[0]?.invoiceId, "open");
  const hidden = suggestExactNameLinks(
    input({
      invoices: [
        {
          id: "open",
          dogId: null,
          litterId: null,
          issueDate: "2024-01-01",
          total: 40000,
          paid: 40000,
          status: "paid",
          number: "100",
          clientName: "Someone",
          historicalIncomeId: null,
        },
      ],
    }),
    [{ dogId: "cyrus-pup", invoiceId: "open" }],
  );
  assert.equal(hidden.length, 0);
  assert.match(nameMatchSummary(suggestions), /1 exact name pair/);

  const many = buildLitterLeague(
    input({
      puppies: Array.from({ length: 32 }, (_, i) => ({
        id: `p${i}`,
        name: `P${i}`,
        status: "sold" as const,
        litterId: "cyrus-litter",
        buyerName: `Buyer ${i}`,
      })),
      invoices: [],
    }),
  );
  const wide = many.find((row) => row.litterId === "cyrus-litter");
  assert.equal(wide?.received.kind, "not_linked");
  assert.match(wide?.coverage ?? "", /0 of 32/);
  const wideDams = buildDamLifetimes(many);
  assert.equal(buildDamSeries(many, wideDams).some((line) => line.damName === "Cyrus"), false);

  console.log("litterReport tests passed");
}

main();
