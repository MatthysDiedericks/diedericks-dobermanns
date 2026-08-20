export const NO_INVOICE_FOR_PAYMENT =
  "Convert the accepted quote to an invoice first — a payment has to belong to a sale.";

export type ProofProvidedBy = "client" | "staff";

export function staffProofOwnerScope(clientId: string | null | undefined, invoiceId: string): string {
  const owner = clientId?.trim() || "kennel";
  return `${owner}/proof_of_payment/${invoiceId}`;
}

export function proofSourceFromDocument(doc: {
  provided_by?: string | null;
  uploaded_by: string | null;
  entity_id: string;
}): ProofProvidedBy {
  if (doc.provided_by === "staff" || doc.provided_by === "client") return doc.provided_by;
  if (doc.uploaded_by && doc.uploaded_by === doc.entity_id) return "client";
  return "staff";
}

export function ledgerProofLabel(
  proofDocumentId: string | null | undefined,
  providedBy: string | null | undefined,
): string | null {
  if (!proofDocumentId) return null;
  return providedBy === "staff" ? "Proof added by staff" : "Proof uploaded by client";
}

export function paymentDateWarning(paidAt: string): string | null {
  if (!paidAt) return null;
  const today = new Date().toISOString().slice(0, 10);
  if (paidAt > today) {
    return "This date is in the future. It will sit in a later month on the cashflow forecast.";
  }
  const then = Date.parse(`${paidAt}T00:00:00`);
  const now = Date.parse(`${today}T00:00:00`);
  if (!Number.isFinite(then) || !Number.isFinite(now)) return null;
  const days = Math.round((now - then) / 86_400_000);
  if (days > 60) {
    return "This date is more than 60 days ago. It will sit in that month on the cashflow forecast.";
  }
  return null;
}
