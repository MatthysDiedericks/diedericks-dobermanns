import type { SupabaseClient } from "@supabase/supabase-js";

import {
  classifyPaymentGap,
  suggestNameMatches,
  type NameSuggestion,
  type PaymentGapInvoice,
  type PaymentGapResolution,
  type RecordInvoice,
} from "@/lib/clients/clientRecord";
import type { AppDatabase } from "@/types/appDatabase";

type Db = SupabaseClient<AppDatabase>;

export type DogSuggestion = NameSuggestion & { dogName: string };

export async function loadInvoiceLinkSuggestions(
  supabase: Db,
  invoiceName: string | null,
): Promise<{ dogs: DogSuggestion[]; contacts: NameSuggestion[] }> {
  const comparedTo = invoiceName?.trim() ?? "";
  if (!comparedTo) return { dogs: [], contacts: [] };

  const [dogs, contacts] = await Promise.all([
    supabase
      .from("dogs")
      .select("id, name, call_name, new_owner_name")
      .not("new_owner_name", "is", null),
    supabase.from("contacts").select("id, full_name").order("full_name"),
  ]);
  if (dogs.error) throw new Error(dogs.error.message);
  if (contacts.error) throw new Error(contacts.error.message);

  const dogRows = (dogs.data ?? []).filter((dog) => dog.new_owner_name?.trim());
  const dogSuggestions = suggestNameMatches(
    comparedTo,
    "Invoice name",
    dogRows.map((dog) => ({
      id: dog.id,
      name: dog.new_owner_name ?? "",
      label: "Owner name on the dog",
    })),
  );
  const dogName = new Map(
    dogRows.map((dog) => [dog.id, dog.call_name?.trim() || dog.name]),
  );

  return {
    dogs: dogSuggestions.map((suggestion) => ({
      ...suggestion,
      dogName: dogName.get(suggestion.id) ?? "Dog",
    })),
    contacts: suggestNameMatches(
      comparedTo,
      "Invoice name",
      (contacts.data ?? []).map((contact) => ({
        id: contact.id,
        name: contact.full_name,
        label: "Contact",
      })),
    ),
  };
}

export type UnlinkedSoldDog = {
  id: string;
  name: string;
  ownerName: string;
  suggestions: NameSuggestion[];
};

export async function loadUnlinkedSoldDogs(supabase: Db): Promise<{
  dogs: UnlinkedSoldDog[];
  contacts: Array<{ id: string; fullName: string }>;
}> {
  const [dogs, contacts] = await Promise.all([
    supabase
      .from("dogs")
      .select("id, name, call_name, new_owner_name, status, buyer_contact_id")
      .eq("status", "sold")
      .is("buyer_contact_id", null)
      .not("new_owner_name", "is", null)
      .order("name"),
    supabase.from("contacts").select("id, full_name").order("full_name"),
  ]);
  if (dogs.error) throw new Error(dogs.error.message);
  if (contacts.error) throw new Error(contacts.error.message);

  const contactRows = (contacts.data ?? []).map((contact) => ({
    id: contact.id,
    fullName: contact.full_name,
  }));
  const candidates = contactRows.map((contact) => ({
    id: contact.id,
    name: contact.fullName,
    label: "Contact",
  }));

  return {
    contacts: contactRows,
    dogs: (dogs.data ?? [])
      .filter((dog) => dog.new_owner_name?.trim())
      .map((dog) => ({
        id: dog.id,
        name: dog.call_name?.trim() || dog.name,
        ownerName: dog.new_owner_name?.trim() ?? "",
        suggestions: suggestNameMatches(dog.new_owner_name ?? "", "Owner name on the dog", candidates),
      })),
  };
}

export async function loadDogInvoices(supabase: Db, dogId: string): Promise<RecordInvoice[]> {
  const { data: invoices, error } = await supabase
    .from("invoices")
    .select("id, invoice_number, status, issue_date, total_amount, amount_paid, dog_id, historical_client_name, historical_income_id")
    .eq("dog_id", dogId)
    .order("issue_date", { ascending: false });
  if (error) throw new Error(error.message);
  const ids = (invoices ?? []).map((invoice) => invoice.id);
  const paymentsByInvoice = new Map<string, Array<{ id: string; amount: number; paymentDate: string; method: string | null; reference: string | null }>>();
  if (ids.length) {
    const { data: payments, error: paymentError } = await supabase
      .from("invoice_payments")
      .select("id, invoice_id, amount, payment_date, payment_method, reference")
      .in("invoice_id", ids);
    if (paymentError) throw new Error(paymentError.message);
    for (const payment of payments ?? []) {
      const list = paymentsByInvoice.get(payment.invoice_id) ?? [];
      list.push({
        id: payment.id,
        amount: Number(payment.amount),
        paymentDate: payment.payment_date,
        method: payment.payment_method,
        reference: payment.reference,
      });
      paymentsByInvoice.set(payment.invoice_id, list);
    }
  }
  return (invoices ?? []).map((invoice) => ({
    id: invoice.id,
    invoiceNumber: invoice.invoice_number,
    status: invoice.status,
    issueDate: invoice.issue_date,
    totalAmount: Number(invoice.total_amount),
    amountPaid: Number(invoice.amount_paid),
    dogId: invoice.dog_id,
    historical: Boolean(invoice.historical_income_id || invoice.historical_client_name),
    payments: paymentsByInvoice.get(invoice.id) ?? [],
  }));
}

export type PaymentGapLists = {
  open: PaymentGapInvoice[];
  resolved: PaymentGapInvoice[];
};

export async function loadPaymentGapLists(supabase: Db): Promise<PaymentGapLists> {
  const [invoices, payments, reviews] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, invoice_number, issue_date, total_amount, amount_paid, status")
      .gt("amount_paid", 0)
      .order("issue_date"),
    supabase.from("invoice_payments").select("invoice_id, notes"),
    supabase
      .from("invoice_payment_gap_reviews")
      .select("invoice_id, resolution, note"),
  ]);
  if (invoices.error) throw new Error(invoices.error.message);
  if (payments.error) throw new Error(payments.error.message);
  let reviewRows = reviews.data ?? [];
  if (reviews.error) {
    if (/invoice_payment_gap_reviews|schema cache/i.test(reviews.error.message)) reviewRows = [];
    else throw new Error(reviews.error.message);
  }

  const paymentCount = new Map<string, number>();
  const closureNote = new Map<string, string>();
  for (const payment of payments.data ?? []) {
    paymentCount.set(payment.invoice_id, (paymentCount.get(payment.invoice_id) ?? 0) + 1);
    if (payment.notes && /supersedes the blanket/i.test(payment.notes)) {
      closureNote.set(payment.invoice_id, payment.notes);
    }
  }
  const reviewByInvoice = new Map(
    reviewRows.map((review) => [
      review.invoice_id,
      {
        resolution: review.resolution as PaymentGapResolution,
        note: review.note,
      },
    ]),
  );

  const open: PaymentGapInvoice[] = [];
  const resolved: PaymentGapInvoice[] = [];
  for (const invoice of invoices.data ?? []) {
    const row: PaymentGapInvoice = {
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      issueDate: invoice.issue_date,
      totalAmount: Number(invoice.total_amount),
      amountPaid: Number(invoice.amount_paid),
      status: invoice.status,
      paymentCount: paymentCount.get(invoice.id) ?? 0,
      review:
        reviewByInvoice.get(invoice.id) ??
        (closureNote.has(invoice.id)
          ? { resolution: "payment_recorded" as const, note: closureNote.get(invoice.id) ?? "" }
          : null),
    };
    const kind = classifyPaymentGap(row);
    if (kind === "open") open.push(row);
    if (kind === "resolved") resolved.push(row);
  }
  return { open, resolved };
}
