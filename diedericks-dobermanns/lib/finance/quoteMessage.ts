import type { Quote } from '@/types/app.types';

const EMAIL_RE = /\S+@\S+\.\S+/;

/** Walk-in quotes stash the quick-add contact string inside `notes`. */
function extractWalkinContact(notes: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/Contact:\s*(.+)$/m);
  return match ? match[1].trim() : null;
}

/** Best-available phone number for a quote's client, whether app-account or walk-in. */
export function quotePhone(quote: Quote): string | null {
  if (quote.client?.phone) return quote.client.phone;
  const contact = extractWalkinContact(quote.notes);
  return contact && !EMAIL_RE.test(contact) ? contact : null;
}

/** Best-available email for a quote's client, whether app-account or walk-in. */
export function quoteEmail(quote: Quote): string | null {
  if (quote.client?.email) return quote.client.email;
  const contact = extractWalkinContact(quote.notes);
  return contact && EMAIL_RE.test(contact) ? contact : null;
}

/** Plain-text summary shared by the WhatsApp and email send actions. */
export function buildQuoteMessage(quote: Quote, changeNote?: string | null): string {
  const name = quote.client?.full_name ?? quote.historical_client_name ?? 'there';
  const rev = quote.revision && quote.revision > 1 ? ` · Revision ${quote.revision}` : '';
  const lines = (quote.items ?? []).map((it) => `- ${it.description}: R${it.line_total.toFixed(2)}`);
  const validUntil = quote.valid_until
    ? `\nValid until ${new Date(quote.valid_until).toLocaleDateString()}.`
    : '';
  const revisionBlock = changeNote?.trim()
    ? [``, changeNote.trim(), `This replaces the earlier version.`, ``]
    : [];
  return [
    `Hi ${name}, here is your quote${quote.quote_number ? ` ${quote.quote_number}${rev}` : ''} from Diedericks Dobermanns:`,
    ...revisionBlock,
    '',
    ...lines,
    '',
    `Total: R${quote.total.toFixed(2)}${validUntil}`,
    '',
    'Thank you!',
  ].join('\n');
}
