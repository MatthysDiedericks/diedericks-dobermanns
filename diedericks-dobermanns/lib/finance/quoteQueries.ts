import type { LineItemInput } from '@/lib/finance/mutations';
import { requireSupabase } from '@/lib/supabase';
import type { Quote, QuoteStatus } from '@/types/app.types';

const EMAIL_RE = /\S+@\S+\.\S+/;

/** Walk-in quotes stash the quick-add contact string inside `notes` (see
 * `confirmWalkin()` in quotes/new.tsx) — there's no dedicated contact column. */
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
export function buildQuoteMessage(quote: Quote): string {
  const name = quote.client?.full_name ?? quote.historical_client_name ?? 'there';
  const lines = (quote.items ?? []).map((it) => `- ${it.description}: R${it.line_total.toFixed(2)}`);
  const validUntil = quote.valid_until
    ? `\nValid until ${new Date(quote.valid_until).toLocaleDateString()}.`
    : '';
  return [
    `Hi ${name}, here is your quote${quote.quote_number ? ` ${quote.quote_number}` : ''} from Diedericks Dobermanns:`,
    '',
    ...lines,
    '',
    `Total: R${quote.total.toFixed(2)}${validUntil}`,
    '',
    'Thank you!',
  ].join('\n');
}

/** Logs a "quote sent" notification for an app-account client (Task 5's email path). */
export async function logQuoteEmailNotification(quote: Quote): Promise<void> {
  if (!quote.client_id) return;
  const supabase = requireSupabase();
  const { error } = await supabase.from('notifications_log').insert({
    recipient_id: quote.client_id,
    subject: `Your Quote${quote.quote_number ? ` ${quote.quote_number}` : ''}`,
    body: buildQuoteMessage(quote),
    type: 'email',
    status: 'sent',
  });
  if (error) console.error('[logQuoteEmailNotification]', error.message);
}

// Intentionally no `createQuickAddClient()` here: `public.users.id` is a hard
// FK to `auth.users(id)` (ON DELETE CASCADE), so a walk-in client with no
// login can't get a real `users` row without first creating a fake
// `auth.users` account — and there's no admin-invite-a-client flow anywhere
// in this codebase (checked `hooks/useAdmin.ts` and the Clients admin
// screens) to create one properly. Quick-add just sets
// `quotes.historical_client_name` directly, the same nullable-text fallback
// `invoices` already uses for buyers with no app account.

const round2 = (n: number) => Math.round(n * 100) / 100;

const QUOTE_SELECT =
  'id, quote_number, client_id, historical_client_name, application_id, status, currency, subtotal, discount, total, ' +
  'notes, valid_until, converted_invoice_id, created_by, created_at, updated_at, ' +
  'client:users(id, full_name, phone, email), ' +
  'items:quote_items(id, item_type, dog_id, description, quantity, unit_price, line_total, sort_order)';

export interface QuoteHeaderInput {
  /** Exactly one of client_id / historical_client_name should be set. */
  client_id: string | null;
  historical_client_name?: string | null;
  application_id?: string | null;
  status?: QuoteStatus;
  notes?: string | null;
  valid_until?: string | null;
  discount?: number;
}

/** Prices line items and returns rows ready for insert, plus the subtotal. */
function priceItems(items: LineItemInput[]) {
  const rows = items.map((it, i) => ({
    item_type: it.item_type,
    dog_id: it.dog_id ?? null,
    description: it.description.trim(),
    quantity: it.quantity,
    unit_price: round2(it.unit_price),
    sort_order: i,
  }));
  const subtotal = round2(rows.reduce((s, it) => s + it.quantity * it.unit_price, 0));
  return { rows, subtotal };
}

export async function fetchAllQuotes(statusFilter?: string): Promise<Quote[]> {
  const supabase = requireSupabase();
  let query = supabase.from('quotes').select(QUOTE_SELECT).order('created_at', { ascending: false });
  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Quote[];
}

export async function fetchQuoteById(id: string): Promise<Quote> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('quotes').select(QUOTE_SELECT).eq('id', id).single();
  if (error) throw new Error(error.message);
  return data as unknown as Quote;
}

/** Creates a new quote (+ line items). `quote_number` is auto-assigned by the DB trigger. */
export async function createQuote(header: QuoteHeaderInput, items: LineItemInput[]): Promise<string> {
  const supabase = requireSupabase();
  const { rows, subtotal } = priceItems(items);
  const discount = round2(header.discount ?? 0);
  const total = Math.max(round2(subtotal - discount), 0);

  const { data, error } = await supabase
    .from('quotes')
    .insert({
      client_id: header.client_id,
      historical_client_name: header.historical_client_name ?? null,
      application_id: header.application_id ?? null,
      status: header.status ?? 'draft',
      currency: 'ZAR',
      subtotal,
      discount,
      total,
      notes: header.notes ?? null,
      valid_until: header.valid_until ?? null,
    })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  const quoteId = (data as { id: string }).id;

  if (rows.length) {
    const itemRows = rows.map((it) => ({ ...it, quote_id: quoteId }));
    const { error: itemErr } = await supabase.from('quote_items').insert(itemRows);
    if (itemErr) throw new Error(itemErr.message);
  }
  return quoteId;
}

/** Updates a quote's header + fully replaces its line items. */
export async function updateQuote(id: string, header: QuoteHeaderInput, items: LineItemInput[]): Promise<void> {
  const supabase = requireSupabase();
  const { rows, subtotal } = priceItems(items);
  const discount = round2(header.discount ?? 0);
  const total = Math.max(round2(subtotal - discount), 0);

  const { error } = await supabase
    .from('quotes')
    .update({
      client_id: header.client_id,
      historical_client_name: header.historical_client_name ?? null,
      application_id: header.application_id ?? null,
      status: header.status,
      subtotal,
      discount,
      total,
      notes: header.notes ?? null,
      valid_until: header.valid_until ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw new Error(error.message);

  const { error: delErr } = await supabase.from('quote_items').delete().eq('quote_id', id);
  if (delErr) throw new Error(delErr.message);
  if (rows.length) {
    const itemRows = rows.map((it) => ({ ...it, quote_id: id }));
    const { error: itemErr } = await supabase.from('quote_items').insert(itemRows);
    if (itemErr) throw new Error(itemErr.message);
  }
}

export async function updateQuoteStatus(id: string, status: QuoteStatus): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.from('quotes').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw new Error(error.message);
}

/**
 * Converts a sent/accepted quote into a real invoice via the
 * `convert_quote_to_invoice` RPC (migration 0039) — a single atomic function
 * so a partial failure can never leave a quote marked accepted with no
 * invoice, or an invoice with no `quote_id` back-reference. Returns the new
 * invoice id.
 */
export async function convertQuoteToInvoice(quoteId: string): Promise<string> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('convert_quote_to_invoice', { p_quote_id: quoteId });
  if (error) throw new Error(error.message);
  return data as string;
}
