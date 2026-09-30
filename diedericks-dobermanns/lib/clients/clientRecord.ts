/**
 * A contact, a dog and an invoice are a complete commercial history.
 * Historical buyers never entered the online pipeline. Do not invent
 * applications, waiting-list rows, quotes or reservations for them.
 *
 * Identity columns (buyer, owner, portal client) are written only from an
 * explicit confirmation. A name resemblance is a suggestion, never a write.
 */

/** Online applications and the waiting list went live on this date. */
export const ONLINE_PIPELINE_START = "2026-08-18";

export const HISTORICAL_PIPELINE_COPY =
  "No application or waiting-list history — this sale pre-dates the online pipeline.";

export const EMPTY_PIPELINE_COPY =
  "No application or waiting-list entry is linked to this contact.";

const EXCLUDED_FROM_MONEY = new Set(["void", "cancelled", "draft"]);

const NAME_TITLES = new Set(["mr", "mrs", "ms", "miss", "dr", "prof"]);

export type RecordPayment = {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  paymentDate: string;
  method: string | null;
  reference: string | null;
  notes: string | null;
};

export type RecordInvoice = {
  id: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  totalAmount: number;
  amountPaid: number;
  dogId: string | null;
  historical: boolean;
  payments: Array<{
    id: string;
    amount: number;
    paymentDate: string;
    method: string | null;
    reference: string | null;
    notes?: string | null;
  }>;
};

export type RecordDog = {
  id: string;
  name: string;
  callName: string | null;
  ownershipStatus: string | null;
  placementDate: string | null;
  doNotContact: boolean;
  buyerContactId: string | null;
  ownerContactId: string | null;
};

export type PipelineRow = {
  id: string;
  label: string;
  meta: string;
  href: string;
};

export type ClientMoney = {
  invoiced: number;
  paid: number;
  outstanding: number;
};

export type ClientInvoiceRow = {
  id: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  outstanding: number;
  ledgerWarning: string | null;
  href: string;
};

export type ClientDogRow = {
  id: string;
  name: string;
  ownershipStatus: string | null;
  placementDate: string | null;
  doNotContact: boolean;
  role: "buyer" | "owner" | "buyer and owner";
  invoices: Array<{ id: string; invoiceNumber: string; href: string }>;
  href: string;
};

export type ClientRecord = {
  money: ClientMoney;
  invoices: ClientInvoiceRow[];
  payments: RecordPayment[];
  dogs: ClientDogRow[];
  waitingList: PipelineRow[];
  quotes: PipelineRow[];
  applications: PipelineRow[];
  pipelineCopy: string | null;
};

export type NameSuggestion = {
  id: string;
  leftLabel: string;
  leftValue: string;
  rightLabel: string;
  rightValue: string;
  score: number;
};

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function moneyFromInvoices(invoices: RecordInvoice[]): ClientMoney {
  const live = invoices.filter((invoice) => !EXCLUDED_FROM_MONEY.has(invoice.status));
  const invoiced = round2(live.reduce((sum, invoice) => sum + invoice.totalAmount, 0));
  const paid = round2(
    live.reduce(
      (sum, invoice) => sum + invoice.payments.reduce((inner, payment) => inner + payment.amount, 0),
      0,
    ),
  );
  return { invoiced, paid, outstanding: round2(invoiced - paid) };
}

function invoiceOutstanding(invoice: RecordInvoice): number {
  if (EXCLUDED_FROM_MONEY.has(invoice.status)) return 0;
  const paid = invoice.payments.reduce((sum, payment) => sum + payment.amount, 0);
  return round2(invoice.totalAmount - paid);
}

export function pipelineSectionCopy(input: {
  pipelineCount: number;
  earliestInvoiceDate: string | null;
  hasHistoricalInvoice: boolean;
}): string | null {
  if (input.pipelineCount > 0) return null;
  const historical =
    input.hasHistoricalInvoice ||
    (input.earliestInvoiceDate != null && input.earliestInvoiceDate < ONLINE_PIPELINE_START);
  if (historical) return HISTORICAL_PIPELINE_COPY;
  return EMPTY_PIPELINE_COPY;
}

function dogRole(dog: RecordDog, contactIds: Set<string>): ClientDogRow["role"] {
  const buyer = dog.buyerContactId != null && contactIds.has(dog.buyerContactId);
  const owner = dog.ownerContactId != null && contactIds.has(dog.ownerContactId);
  if (buyer && owner) return "buyer and owner";
  if (owner) return "owner";
  return "buyer";
}

export function assembleClientRecord(input: {
  contactIds: string[];
  invoices: RecordInvoice[];
  dogs: RecordDog[];
  waitingList: PipelineRow[];
  quotes: PipelineRow[];
  applications: PipelineRow[];
  invoiceHref: (id: string) => string;
  dogHref: (id: string) => string;
}): ClientRecord {
  const contactIds = new Set(input.contactIds);
  const invoices = [...input.invoices].sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  const liveDates = invoices
    .filter((invoice) => !EXCLUDED_FROM_MONEY.has(invoice.status))
    .map((invoice) => invoice.issueDate)
    .filter(Boolean)
    .sort();
  const pipelineCount =
    input.waitingList.length + input.quotes.length + input.applications.length;

  const payments: RecordPayment[] = invoices
    .flatMap((invoice) =>
      invoice.payments.map((payment) => ({
        id: payment.id,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        amount: payment.amount,
        paymentDate: payment.paymentDate,
        method: payment.method,
        reference: payment.reference,
        notes: payment.notes ?? null,
      })),
    )
    .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));

  const dogs: ClientDogRow[] = input.dogs.map((dog) => ({
    id: dog.id,
    name: dog.callName?.trim() || dog.name,
    ownershipStatus: dog.ownershipStatus,
    placementDate: dog.placementDate,
    doNotContact: dog.doNotContact,
    role: dogRole(dog, contactIds),
    invoices: invoices
      .filter((invoice) => invoice.dogId === dog.id)
      .map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        href: input.invoiceHref(invoice.id),
      })),
    href: input.dogHref(dog.id),
  }));

  return {
    money: moneyFromInvoices(invoices),
    invoices: invoices.map((invoice) => ({
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      status: invoice.status,
      issueDate: invoice.issueDate,
      outstanding: invoiceOutstanding(invoice),
      ledgerWarning:
        invoice.amountPaid > 0 && invoice.payments.length === 0
          ? "Amount paid is set, but there is no payment record."
          : null,
      href: input.invoiceHref(invoice.id),
    })),
    payments,
    dogs,
    waitingList: input.waitingList,
    quotes: input.quotes,
    applications: input.applications,
    pipelineCopy: pipelineSectionCopy({
      pipelineCount,
      earliestInvoiceDate: liveDates[0] ?? null,
      hasHistoricalInvoice: invoices.some((invoice) => invoice.historical),
    }),
  };
}

export function normalisePersonName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((token) => token && !NAME_TITLES.has(token))
    .join(" ");
}

export function nameResemblance(a: string, b: string): number {
  const left = normalisePersonName(a);
  const right = normalisePersonName(b);
  if (!left || !right) return 0;
  if (left === right) return 1;
  const leftTokens = left.split(" ");
  const rightTokens = right.split(" ");
  const shorter = leftTokens.length <= rightTokens.length ? leftTokens : rightTokens;
  const longer = leftTokens.length <= rightTokens.length ? rightTokens : leftTokens;
  if (shorter.every((token) => longer.includes(token))) return 0.9;
  const leftLast = leftTokens[leftTokens.length - 1] ?? "";
  const rightLast = rightTokens[rightTokens.length - 1] ?? "";
  if (leftLast.length >= 5 && leftLast === rightLast) return 0.6;
  return 0;
}

/** Display-only. The returned objects are not a database write. */
export function suggestNameMatches(
  comparedTo: string,
  comparedLabel: string,
  candidates: Array<{ id: string; name: string; label: string }>,
): NameSuggestion[] {
  return candidates
    .map((candidate) => ({
      id: candidate.id,
      leftLabel: candidate.label,
      leftValue: candidate.name,
      rightLabel: comparedLabel,
      rightValue: comparedTo,
      score: nameResemblance(candidate.name, comparedTo),
    }))
    .filter((row) => row.score >= 0.6)
    .sort((a, b) => b.score - a.score || a.leftValue.localeCompare(b.leftValue))
    .slice(0, 5);
}

const SUGGESTION_KEYS = ["id", "leftLabel", "leftValue", "rightLabel", "rightValue", "score"] as const;

export function suggestionCarriesIdentityWrite(value: object): boolean {
  const forbidden = ["buyer_contact_id", "owner_contact_id", "client_id", "contact_id", "dog_id"];
  const keys = Object.keys(value);
  if (forbidden.some((key) => keys.includes(key))) return true;
  return keys.some((key) => !SUGGESTION_KEYS.includes(key as (typeof SUGGESTION_KEYS)[number]));
}

export function invoiceDogLinkPatch(input: {
  confirmed: boolean;
  dogId: string | null;
}): { error: string } | { dog_id: string | null } {
  if (input.confirmed !== true) {
    return { error: "A person has to confirm this link. A name match is not a link." };
  }
  return { dog_id: input.dogId };
}

export function invoiceContactLinkPatch(input: {
  confirmed: boolean;
  contactId: string | null;
}): { error: string } | { contact_id: string | null } {
  if (input.confirmed !== true) {
    return { error: "A person has to confirm this link. A name match is not a link." };
  }
  return { contact_id: input.contactId };
}

/**
 * Sets the buyer, and the current owner only when that box was ticked.
 * Never sets client_id. Never called from a name score.
 */
export function buyerLinkPatch(input: {
  confirmed: boolean;
  contactId: string;
  alsoCurrentOwner: boolean;
}): { error: string } | { buyer_contact_id: string; owner_contact_id?: string } {
  if (input.confirmed !== true) {
    return { error: "A person has to confirm this link. A name match is not a link." };
  }
  if (!input.contactId) return { error: "Choose a contact." };
  const patch: { buyer_contact_id: string; owner_contact_id?: string } = {
    buyer_contact_id: input.contactId,
  };
  if (input.alsoCurrentOwner) patch.owner_contact_id = input.contactId;
  return patch;
}

export function identityLinkAudit(input: {
  table: "invoices" | "dogs";
  recordId: string;
  field: "dog_id" | "contact_id" | "buyer_contact_id" | "owner_contact_id";
  before: string | null;
  after: string | null;
  actorId: string;
}) {
  return {
    table_name: input.table,
    record_id: input.recordId,
    action: "update" as const,
    actor_id: input.actorId,
    changed_fields: [input.field],
    old_values: { [input.field]: input.before, confirmed_by_person: true },
    new_values: { [input.field]: input.after, confirmed_by_person: true },
  };
}

export type PaymentGapResolution = "explained" | "payment_recorded";

export type PaymentGapInvoice = {
  id: string;
  invoiceNumber: string;
  issueDate: string;
  totalAmount: number;
  amountPaid: number;
  status: string;
  paymentCount: number;
  review: { resolution: PaymentGapResolution; note: string } | null;
};

export function classifyPaymentGap(row: PaymentGapInvoice): "open" | "resolved" | "omit" {
  if (row.review) return "resolved";
  if (row.amountPaid > 0 && row.paymentCount === 0) return "open";
  return "omit";
}

/** An explanation only. This object has no amount_paid, so it cannot settle an invoice. */
export function paymentGapReviewWrite(input: {
  note: string;
  resolution: PaymentGapResolution;
}): { error: string } | { resolution: PaymentGapResolution; note: string } {
  const note = input.note.trim();
  if (note.length < 8) {
    return { error: "Say what actually happened, in a sentence." };
  }
  return { resolution: input.resolution, note };
}
