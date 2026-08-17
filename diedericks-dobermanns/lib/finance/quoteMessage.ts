import type { Quote } from '@/types/app.types';
import {
  quoteBuyerEmail,
  quoteBuyerName,
  quoteBuyerPhone,
} from '@/lib/finance/quoteBuyerDisplay';

const EMAIL_RE = /\S+@\S+\.\S+/;

/** Walk-in quotes stash the quick-add contact string inside `notes`. */
function extractWalkinContact(notes: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/Contact:\s*(.+)$/m);
  return match ? match[1].trim() : null;
}

/** Best-available phone: portal user → active contact → application → walk-in notes. */
export function quotePhone(quote: Quote): string | null {
  const fromBuyer = quoteBuyerPhone(quote);
  if (fromBuyer) return fromBuyer;
  const contact = extractWalkinContact(quote.notes);
  return contact && !EMAIL_RE.test(contact) ? contact : null;
}

/** Best-available email: portal user → active contact → application → walk-in notes. */
export function quoteEmail(quote: Quote): string | null {
  const fromBuyer = quoteBuyerEmail(quote);
  if (fromBuyer) return fromBuyer;
  const contact = extractWalkinContact(quote.notes);
  return contact && EMAIL_RE.test(contact) ? contact : null;
}

/** Plain-text summary shared by the WhatsApp and email send actions. */
export function buildQuoteMessage(quote: Quote, changeNote?: string | null): string {
  const resolved = quoteBuyerName(quote);
  const name = resolved === 'Unassigned' ? 'there' : resolved;
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
