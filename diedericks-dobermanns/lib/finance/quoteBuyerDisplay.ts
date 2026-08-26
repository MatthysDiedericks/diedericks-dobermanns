/** Shared buyer resolution for every quote list and message. */

export type QuoteBuyerContact = {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  merged_into_contact_id?: string | null;
} | null;

export type QuoteBuyerSource = {
  client_id?: string | null;
  historical_client_name?: string | null;
  client?: { full_name?: string | null; email?: string | null; phone?: string | null } | null;
  contact?: QuoteBuyerContact;
  application?: { email?: string | null; phone?: string | null } | null;
};

const UNASSIGNED = 'Unassigned';

/** Merged contacts are never a buyer — they exist only as a redirect. */
export function activeQuoteContact(contact: QuoteBuyerContact): QuoteBuyerContact {
  if (!contact || contact.merged_into_contact_id) return null;
  return contact;
}

function firstText(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

/** client (users) → active contact → historical name → Unassigned. */
export function quoteBuyerName(quote: QuoteBuyerSource): string {
  const contact = activeQuoteContact(quote.contact ?? null);
  return (
    firstText(quote.client?.full_name, contact?.full_name, quote.historical_client_name) ??
    UNASSIGNED
  );
}

/** client (users) → active contact → application email. */
export function quoteBuyerEmail(quote: QuoteBuyerSource): string | null {
  const contact = activeQuoteContact(quote.contact ?? null);
  return firstText(quote.client?.email, contact?.email, quote.application?.email);
}

export function quoteBuyerPhone(quote: QuoteBuyerSource): string | null {
  const contact = activeQuoteContact(quote.contact ?? null);
  return firstText(quote.client?.phone, contact?.phone, quote.application?.phone);
}

/**
 * client_id is set when a portal account exists (at quote creation, not at
 * first sign-in). The marker means no account exists — not "has not signed in".
 */
export function quoteBuyerDisplay(quote: QuoteBuyerSource) {
  const name = quoteBuyerName(quote);
  const hasPortalAccount = Boolean(quote.client_id);
  return {
    name,
    email: quoteBuyerEmail(quote),
    phone: quoteBuyerPhone(quote),
    hasPortalAccount,
    showNoPortalMarker: name !== UNASSIGNED && !hasPortalAccount,
  };
}

/** List label: DD-1135 · rev 2 when the working revision is above 1. */
export function quoteListNumber(
  number: string | null | undefined,
  revision?: number | null,
): string {
  const n = number?.trim() || 'Draft';
  return revision && revision > 1 ? `${n} · rev ${revision}` : n;
}
