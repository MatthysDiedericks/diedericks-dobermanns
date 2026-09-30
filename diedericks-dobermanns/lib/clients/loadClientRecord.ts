import type { SupabaseClient } from "@supabase/supabase-js";

import {
  assembleClientRecord,
  type ClientRecord,
  type PipelineRow,
  type RecordDog,
  type RecordInvoice,
} from "@/lib/clients/clientRecord";
import type { AppDatabase } from "@/types/appDatabase";

type Db = SupabaseClient<AppDatabase>;

const DOG_COLUMNS =
  "id, name, call_name, ownership_status, placement_date, do_not_contact, buyer_contact_id, owner_contact_id";

const INVOICE_COLUMNS_BASE =
  "id, invoice_number, status, issue_date, total_amount, amount_paid, dog_id, client_id, historical_client_name, historical_income_id";
const INVOICE_COLUMNS = `${INVOICE_COLUMNS_BASE}, contact_id`;

type DogRow = {
  id: string;
  name: string;
  call_name: string | null;
  ownership_status: string | null;
  placement_date: string | null;
  do_not_contact: boolean | null;
  buyer_contact_id: string | null;
  owner_contact_id: string | null;
};

type InvoiceRow = {
  id: string;
  invoice_number: string;
  status: string;
  issue_date: string;
  total_amount: number;
  amount_paid: number;
  dog_id: string | null;
  contact_id: string | null;
  client_id: string | null;
  historical_client_name: string | null;
  historical_income_id: string | null;
};

function missingColumn(message: string, column: string): boolean {
  return new RegExp(column, "i").test(message);
}

/** contact_id is added in migration 0199. Until that is applied, dog and portal links still count. */
async function invoicesForContacts(supabase: Db, contactIds: string[]) {
  const withContact = await supabase.from("invoices").select(INVOICE_COLUMNS).in("contact_id", contactIds);
  if (!withContact.error) return withContact;
  if (!missingColumn(withContact.error.message, "contact_id")) return withContact;
  return { data: [] as InvoiceRow[], error: null };
}

function asDog(row: DogRow): RecordDog {
  return {
    id: row.id,
    name: row.name,
    callName: row.call_name,
    ownershipStatus: row.ownership_status,
    placementDate: row.placement_date,
    doNotContact: Boolean(row.do_not_contact),
    buyerContactId: row.buyer_contact_id,
    ownerContactId: row.owner_contact_id,
  };
}

export async function loadClientRecord(
  supabase: Db,
  contact: { id: string; email: string | null; userId: string | null },
  hrefs: {
    invoice: (id: string) => string;
    dog: (id: string) => string;
    quote: (id: string) => string;
    application: (id: string) => string;
    waitingList: (id: string) => string;
  },
): Promise<ClientRecord> {
  const { data: aliases, error: aliasError } = await supabase
    .from("contacts")
    .select("id")
    .eq("merged_into_contact_id", contact.id);
  if (aliasError) throw new Error(aliasError.message);
  const contactIds = [contact.id, ...(aliases ?? []).map((row) => row.id)];

  const [ownerDogs, buyerDogs] = await Promise.all([
    supabase.from("dogs").select(DOG_COLUMNS).in("owner_contact_id", contactIds),
    supabase.from("dogs").select(DOG_COLUMNS).in("buyer_contact_id", contactIds),
  ]);
  if (ownerDogs.error) throw new Error(ownerDogs.error.message);
  if (buyerDogs.error) throw new Error(buyerDogs.error.message);

  const dogMap = new Map<string, RecordDog>();
  for (const raw of [...(ownerDogs.data ?? []), ...(buyerDogs.data ?? [])] as DogRow[]) {
    dogMap.set(raw.id, asDog(raw));
  }
  const dogIds = [...dogMap.keys()];

  const invoiceMap = new Map<string, InvoiceRow>();
  const takeInvoices = async (
    result: PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>,
  ) => {
    const { data, error } = await result;
    if (error) throw new Error(error.message);
    for (const raw of (data ?? []) as InvoiceRow[]) invoiceMap.set(raw.id, raw);
  };

  const invoicePulls: Array<Promise<void>> = [
    takeInvoices(invoicesForContacts(supabase, contactIds)),
  ];
  if (dogIds.length) {
    invoicePulls.push(
      takeInvoices(supabase.from("invoices").select(INVOICE_COLUMNS).in("dog_id", dogIds)),
    );
  }
  if (contact.userId) {
    invoicePulls.push(
      takeInvoices(
        supabase.from("invoices").select(INVOICE_COLUMNS).eq("client_id", contact.userId),
      ),
    );
  }

  const { data: quoteRows, error: quoteError } = await supabase
    .from("quotes")
    .select("id, quote_number, status, total, created_at, converted_invoice_id")
    .in("contact_id", contactIds)
    .order("created_at", { ascending: false });
  if (quoteError) throw new Error(quoteError.message);

  const quoteInvoiceIds = (quoteRows ?? [])
    .map((row) => row.converted_invoice_id)
    .filter((id): id is string => Boolean(id));
  if (quoteInvoiceIds.length) {
    invoicePulls.push(
      takeInvoices(supabase.from("invoices").select(INVOICE_COLUMNS).in("id", quoteInvoiceIds)),
    );
  }
  await Promise.all(invoicePulls);

  const invoiceIds = [...invoiceMap.keys()];
  const paymentsByInvoice = new Map<string, RecordInvoice["payments"]>();
  if (invoiceIds.length) {
    const { data: paymentRows, error: paymentError } = await supabase
      .from("invoice_payments")
      .select("id, invoice_id, amount, payment_date, payment_method, reference, notes")
      .in("invoice_id", invoiceIds);
    if (paymentError) throw new Error(paymentError.message);
    for (const payment of paymentRows ?? []) {
      const list = paymentsByInvoice.get(payment.invoice_id) ?? [];
      list.push({
        id: payment.id,
        amount: Number(payment.amount),
        paymentDate: payment.payment_date,
        method: payment.payment_method,
        reference: payment.reference,
        notes: payment.notes,
      });
      paymentsByInvoice.set(payment.invoice_id, list);
    }
  }

  const invoices: RecordInvoice[] = [...invoiceMap.values()].map((row) => ({
    id: row.id,
    invoiceNumber: row.invoice_number,
    status: row.status,
    issueDate: row.issue_date,
    totalAmount: Number(row.total_amount),
    amountPaid: Number(row.amount_paid),
    dogId: row.dog_id,
    historical: Boolean(row.historical_income_id || row.historical_client_name),
    payments: paymentsByInvoice.get(row.id) ?? [],
  }));

  const email = contact.email?.trim() || null;
  const waiting: PipelineRow[] = [];
  const seenWaiting = new Set<string>();
  const pushWaiting = (
    rows: Array<{
      id: string;
      enquirer_name: string | null;
      status: string;
      pipeline_stage: string;
      date_added: string;
    }>,
  ) => {
    for (const row of rows) {
      if (seenWaiting.has(row.id)) continue;
      seenWaiting.add(row.id);
      waiting.push({
        id: row.id,
        label: row.enquirer_name?.trim() || "Waiting list",
        meta: [row.pipeline_stage, row.status, row.date_added].filter(Boolean).join(" · "),
        href: hrefs.waitingList(row.id),
      });
    }
  };

  if (contact.userId) {
    const { data, error } = await supabase
      .from("waiting_list")
      .select("id, enquirer_name, status, pipeline_stage, date_added")
      .eq("client_id", contact.userId);
    if (error) throw new Error(error.message);
    pushWaiting(data ?? []);
  }
  if (email) {
    const { data, error } = await supabase
      .from("waiting_list")
      .select("id, enquirer_name, status, pipeline_stage, date_added")
      .ilike("enquirer_email", email);
    if (error) throw new Error(error.message);
    pushWaiting(data ?? []);
  }

  const applications: PipelineRow[] = [];
  const seenApplications = new Set<string>();
  const pushApplications = (
    rows: Array<{
      id: string;
      full_name: string;
      status: string;
      reference_code: string | null;
    }>,
  ) => {
    for (const row of rows) {
      if (seenApplications.has(row.id)) continue;
      seenApplications.add(row.id);
      applications.push({
        id: row.id,
        label: row.full_name,
        meta: [row.status, row.reference_code].filter(Boolean).join(" · "),
        href: hrefs.application(row.id),
      });
    }
  };
  if (email) {
    const { data, error } = await supabase
      .from("applications")
      .select("id, full_name, status, reference_code")
      .ilike("email", email);
    if (error) throw new Error(error.message);
    pushApplications(data ?? []);
  }
  if (contact.userId) {
    const { data, error } = await supabase
      .from("applications")
      .select("id, full_name, status, reference_code")
      .eq("user_id", contact.userId);
    if (error) throw new Error(error.message);
    pushApplications(data ?? []);
  }

  const quotes: PipelineRow[] = (quoteRows ?? []).map((row) => ({
    id: row.id,
    label: row.quote_number,
    meta: [row.status, row.total != null ? String(row.total) : null].filter(Boolean).join(" · "),
    href: hrefs.quote(row.id),
  }));

  return assembleClientRecord({
    contactIds,
    invoices,
    dogs: [...dogMap.values()].sort((a, b) => a.name.localeCompare(b.name)),
    waitingList: waiting,
    quotes,
    applications,
    invoiceHref: hrefs.invoice,
    dogHref: hrefs.dog,
  });
}
