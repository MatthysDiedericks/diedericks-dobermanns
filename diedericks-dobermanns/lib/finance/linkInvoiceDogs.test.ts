import assert from "node:assert/strict";

import { planInvoiceDogLinks } from "./linkInvoiceDogs";

/** Run: npx tsx src/lib/finance/linkInvoiceDogs.test.ts */

function main() {
  const one = planInvoiceDogLinks({
    quotes: [{ id: "q1", convertedInvoiceId: "inv-1", itemDogIds: ["dog-a", null] }],
    invoices: [{ id: "inv-1", dogId: null, quoteId: "q1" }],
    lines: [],
  });
  assert.deepEqual(one.links, [
    { invoiceId: "inv-1", dogId: "dog-a", via: "quote_single_dog" },
  ]);
  assert.equal(one.refused.length, 0);

  const fuzzy = planInvoiceDogLinks({
    quotes: [
      {
        id: "q-name",
        convertedInvoiceId: "inv-name",
        itemDogIds: [null],
      },
    ],
    invoices: [{ id: "inv-name", dogId: null, quoteId: "q-name" }],
    lines: [],
  });
  assert.equal(fuzzy.links.length, 0);
  assert.equal(fuzzy.refused.length, 0);

  const manyDogs = planInvoiceDogLinks({
    quotes: [{ id: "q2", convertedInvoiceId: "inv-2", itemDogIds: ["dog-a", "dog-b"] }],
    invoices: [{ id: "inv-2", dogId: null, quoteId: "q2" }],
    lines: [{ invoiceId: "inv-2", dogId: "dog-a" }],
  });
  assert.equal(manyDogs.links.length, 0);
  assert.equal(manyDogs.refused[0]?.reason, "multiple_dogs_on_quote");

  const manyInvoices = planInvoiceDogLinks({
    quotes: [{ id: "q3", convertedInvoiceId: "inv-3a", itemDogIds: ["dog-a"] }],
    invoices: [
      { id: "inv-3a", dogId: null, quoteId: "q3" },
      { id: "inv-3b", dogId: null, quoteId: "q3" },
    ],
    lines: [],
  });
  assert.equal(manyInvoices.links.length, 0);
  assert.equal(manyInvoices.refused[0]?.reason, "quote_has_multiple_invoices");

  const oneLine = planInvoiceDogLinks({
    quotes: [],
    invoices: [{ id: "inv-4", dogId: null, quoteId: null }],
    lines: [{ invoiceId: "inv-4", dogId: "dog-c" }],
  });
  assert.equal(oneLine.links[0]?.via, "invoice_single_line");
  assert.equal(oneLine.links[0]?.dogId, "dog-c");

  const twoLines = planInvoiceDogLinks({
    quotes: [],
    invoices: [{ id: "inv-5", dogId: null, quoteId: null }],
    lines: [
      { invoiceId: "inv-5", dogId: "dog-a" },
      { invoiceId: "inv-5", dogId: "dog-b" },
    ],
  });
  assert.equal(twoLines.links.length, 0);
  assert.equal(twoLines.refused[0]?.reason, "multiple_dogs_on_invoice_lines");

  const sameDogTwoLines = planInvoiceDogLinks({
    quotes: [],
    invoices: [{ id: "inv-6", dogId: null, quoteId: null }],
    lines: [
      { invoiceId: "inv-6", dogId: "dog-a" },
      { invoiceId: "inv-6", dogId: "dog-a" },
    ],
  });
  assert.equal(sameDogTwoLines.links.length, 0);
  assert.equal(sameDogTwoLines.refused.length, 0);

  const already = planInvoiceDogLinks({
    quotes: [{ id: "q7", convertedInvoiceId: "inv-7", itemDogIds: ["dog-a"] }],
    invoices: [{ id: "inv-7", dogId: "dog-a", quoteId: "q7" }],
    lines: [],
  });
  assert.equal(already.links.length, 0);
  assert.equal(already.refused.length, 0);

  const clash = planInvoiceDogLinks({
    quotes: [{ id: "q8", convertedInvoiceId: "inv-8", itemDogIds: ["dog-b"] }],
    invoices: [{ id: "inv-8", dogId: "dog-a", quoteId: "q8" }],
    lines: [],
  });
  assert.equal(clash.links.length, 0);
  assert.equal(clash.refused[0]?.reason, "invoice_already_linked_to_other_dog");

  const first = planInvoiceDogLinks({
    quotes: [{ id: "q9", convertedInvoiceId: "inv-9", itemDogIds: ["dog-a"] }],
    invoices: [{ id: "inv-9", dogId: null, quoteId: "q9" }],
    lines: [],
  });
  assert.equal(first.links.length, 1);
  const second = planInvoiceDogLinks({
    quotes: [{ id: "q9", convertedInvoiceId: "inv-9", itemDogIds: ["dog-a"] }],
    invoices: [{ id: "inv-9", dogId: first.links[0]!.dogId, quoteId: "q9" }],
    lines: [],
  });
  assert.equal(second.links.length, 0);

  console.log("linkInvoiceDogs tests passed");
}

main();
