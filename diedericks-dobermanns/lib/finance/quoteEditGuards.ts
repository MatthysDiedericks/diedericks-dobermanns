import type { QuoteStatus } from '@/types/app.types';

export type QuoteEditBlock =
  | { ok: true; nextStatus: QuoteStatus }
  | { ok: false; error: string; invoiceId?: string };

/** Server-side status rules for editing a quote. Never rely on the UI alone. */
export function assertQuoteEditable(quote: {
  status: QuoteStatus;
  converted_invoice_id: string | null;
}): QuoteEditBlock {
  if (quote.converted_invoice_id) {
    return {
      ok: false,
      error: 'This quote has been converted to an invoice and cannot be edited.',
      invoiceId: quote.converted_invoice_id,
    };
  }
  if (quote.status === 'accepted') {
    return {
      ok: false,
      error:
        'This quote has been accepted. Reopen it with a reason before editing — quietly changing an agreed price removes the client\'s agreement from the record.',
    };
  }
  if (quote.status === 'draft' || quote.status === 'sent') {
    return { ok: true, nextStatus: quote.status };
  }
  if (
    quote.status === 'declined' ||
    quote.status === 'expired' ||
    quote.status === 'cancelled'
  ) {
    return { ok: true, nextStatus: 'draft' };
  }
  return { ok: false, error: `Quotes with status "${quote.status}" cannot be edited.` };
}

export function summariseQuoteChanges(
  before: { description: string; quantity: number; unit_price: number; line_total: number }[],
  after: { description: string; quantity: number; unit_price: number; line_total: number }[],
  previousSentAt: string | null,
): string {
  const beforeKeys = new Map(
    before.map((l) => [`${l.description}|${l.unit_price}|${l.quantity}`, l]),
  );
  const afterKeys = new Map(
    after.map((l) => [`${l.description}|${l.unit_price}|${l.quantity}`, l]),
  );
  const added = after.filter(
    (l) => !beforeKeys.has(`${l.description}|${l.unit_price}|${l.quantity}`),
  );
  const removed = before.filter(
    (l) => !afterKeys.has(`${l.description}|${l.unit_price}|${l.quantity}`),
  );
  const parts: string[] = [];
  if (added.length) {
    parts.push(`Added: ${added.map((l) => l.description.trim() || 'line').slice(0, 3).join('; ')}`);
  }
  if (removed.length) {
    parts.push(
      `Removed: ${removed.map((l) => l.description.trim() || 'line').slice(0, 3).join('; ')}`,
    );
  }
  if (!parts.length) parts.push('Quote revised');
  let note = parts.join('. ') + '.';
  if (previousSentAt) {
    const label = new Date(previousSentAt).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    note += ` This replaces the quote sent on ${label}.`;
  }
  return note;
}

export function formatRevisionBanner(
  currentSentAt: string | null,
  previousSentAt: string | null,
): string | null {
  if (!previousSentAt || !currentSentAt) return null;
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `Revised ${fmt(currentSentAt)} — replaces the version sent ${fmt(previousSentAt)}.`;
}
