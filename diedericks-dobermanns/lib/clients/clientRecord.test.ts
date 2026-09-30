import assert from "node:assert/strict";

import {
  HISTORICAL_PIPELINE_COPY,
  assembleClientRecord,
  buyerLinkPatch,
  classifyPaymentGap,
  identityLinkAudit,
  invoiceContactLinkPatch,
  invoiceDogLinkPatch,
  moneyFromInvoices,
  paymentGapReviewWrite,
  suggestNameMatches,
  suggestionCarriesIdentityWrite,
} from "./clientRecord";

/** Run: npx tsx src/lib/clients/clientRecord.test.ts */

const bruce = "f4fb4826-cb2a-4294-9f42-ce4b6ff20348";
const gerhard = "83a7ac07-5ac9-4dee-9819-7a683c5f574e";

const gerhardRecord = assembleClientRecord({
  contactIds: [gerhard],
  invoiceHref: (id) => `/admin/finance/invoices/${id}`,
  dogHref: (id) => `/admin/dogs/${id}`,
  waitingList: [],
  quotes: [],
  applications: [],
  dogs: [
    {
      id: bruce,
      name: "Bruce",
      callName: "Bruce",
      ownershipStatus: "with_owner",
      placementDate: null,
      doNotContact: false,
      buyerContactId: gerhard,
      ownerContactId: gerhard,
    },
  ],
  invoices: [
    {
      id: "inv-1087",
      invoiceNumber: "1087",
      status: "partially_paid",
      issueDate: "2026-06-09",
      totalAmount: 55000,
      amountPaid: 10000,
      dogId: bruce,
      historical: true,
      payments: [
        {
          id: "pay-1",
          amount: 10000,
          paymentDate: "2026-06-09",
          method: "eft",
          reference: null,
        },
      ],
    },
  ],
});

assert.deepEqual(gerhardRecord.money, { invoiced: 55000, paid: 10000, outstanding: 45000 });
assert.equal(gerhardRecord.invoices[0]?.invoiceNumber, "1087");
assert.equal(gerhardRecord.invoices[0]?.outstanding, 45000);
assert.equal(gerhardRecord.dogs[0]?.name, "Bruce");
assert.equal(gerhardRecord.dogs[0]?.invoices[0]?.invoiceNumber, "1087");
assert.equal(gerhardRecord.payments[0]?.amount, 10000);
assert.equal(gerhardRecord.payments[0]?.method, "eft");
assert.equal(gerhardRecord.payments[0]?.paymentDate, "2026-06-09");
assert.equal(gerhardRecord.pipelineCopy, HISTORICAL_PIPELINE_COPY);

const empty = assembleClientRecord({
  contactIds: ["nobody"],
  invoices: [],
  dogs: [],
  waitingList: [],
  quotes: [],
  applications: [],
  invoiceHref: (id) => id,
  dogHref: (id) => id,
});
assert.deepEqual(empty.money, { invoiced: 0, paid: 0, outstanding: 0 });
assert.equal(empty.invoices.length, 0);
assert.equal(empty.pipelineCopy?.includes("No application"), true);

const ignoredPaidFigure = moneyFromInvoices([
  {
    id: "gap",
    invoiceNumber: "2000",
    status: "paid",
    issueDate: "2024-01-01",
    totalAmount: 8000,
    amountPaid: 8000,
    dogId: null,
    historical: true,
    payments: [],
  },
]);
assert.equal(ignoredPaidFigure.paid, 0);
assert.equal(ignoredPaidFigure.outstanding, 8000);

const suggestions = suggestNameMatches("Gerhard Nagel", "Invoice name", [
  { id: bruce, name: "Gerhard Nagel", label: "Owner name on the dog" },
  { id: "other", name: "Someone Else", label: "Owner name on the dog" },
]);
assert.equal(suggestions.length, 1);
assert.equal(suggestions[0]?.leftValue, "Gerhard Nagel");
assert.equal(suggestions[0]?.rightValue, "Gerhard Nagel");
assert.equal(suggestionCarriesIdentityWrite(suggestions[0] ?? {}), false);

const refused = buyerLinkPatch({
  confirmed: false,
  contactId: suggestions[0]?.id ?? gerhard,
  alsoCurrentOwner: false,
});
assert.equal("error" in refused, true);

const buyerOnly = buyerLinkPatch({
  confirmed: true,
  contactId: gerhard,
  alsoCurrentOwner: false,
});
assert.deepEqual(buyerOnly, { buyer_contact_id: gerhard });
assert.equal("client_id" in buyerOnly, false);
assert.equal("owner_contact_id" in buyerOnly, false);

const withOwner = buyerLinkPatch({
  confirmed: true,
  contactId: gerhard,
  alsoCurrentOwner: true,
});
assert.deepEqual(withOwner, {
  buyer_contact_id: gerhard,
  owner_contact_id: gerhard,
});

const contactLink = invoiceContactLinkPatch({ confirmed: true, contactId: gerhard });
assert.deepEqual(contactLink, { contact_id: gerhard });
assert.equal("client_id" in contactLink, false);
assert.equal("buyer_contact_id" in contactLink, false);
assert.equal("error" in invoiceContactLinkPatch({ confirmed: false, contactId: gerhard }), true);

const linked = invoiceDogLinkPatch({ confirmed: true, dogId: bruce });
const cleared = invoiceDogLinkPatch({ confirmed: true, dogId: null });
assert.deepEqual(linked, { dog_id: bruce });
assert.deepEqual(cleared, { dog_id: null });
assert.equal("error" in invoiceDogLinkPatch({ confirmed: false, dogId: bruce }), true);

const audit = identityLinkAudit({
  table: "invoices",
  recordId: "inv-1087",
  field: "dog_id",
  before: bruce,
  after: null,
  actorId: "user-1",
});
assert.equal(audit.table_name, "invoices");
assert.equal(audit.action, "update");
assert.deepEqual(audit.changed_fields, ["dog_id"]);
assert.equal(audit.old_values.dog_id, bruce);
assert.equal(audit.new_values.dog_id, null);
assert.equal(audit.new_values.confirmed_by_person, true);

const openGap = classifyPaymentGap({
  id: "open",
  invoiceNumber: "2001",
  issueDate: "2024-05-01",
  totalAmount: 5000,
  amountPaid: 5000,
  status: "paid",
  paymentCount: 0,
  review: null,
});
const resolved = classifyPaymentGap({
  id: "inv-1087",
  invoiceNumber: "1087",
  issueDate: "2026-06-09",
  totalAmount: 55000,
  amountPaid: 10000,
  status: "partially_paid",
  paymentCount: 1,
  review: {
    resolution: "payment_recorded",
    note: "R10 000 deposit on 9 Jun 2026 is the only payment.",
  },
});
assert.equal(openGap, "open");
assert.equal(resolved, "resolved");

const explanation = paymentGapReviewWrite({
  note: "Genuinely paid in cash. The slip was not imported.",
  resolution: "explained",
});
assert.equal("amount_paid" in explanation, false);
assert.equal("error" in explanation, false);
if (!("error" in explanation)) {
  assert.equal(explanation.resolution, "explained");
}
assert.equal("error" in paymentGapReviewWrite({ note: "short", resolution: "explained" }), true);

console.log("clientRecord.test.ts ok");
