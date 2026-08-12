import type { LineItemInput } from '@/lib/finance/mutations';
import { assertQuoteEditable } from '@/lib/finance/quoteEditGuards';
import { resolveClientForApplicationQuote } from '@/lib/finance/linkQuoteClient';
import { buildQuoteMessage } from '@/lib/finance/quoteMessage';
import { requireSupabase } from '@/lib/supabase';
import type { Quote, QuoteStatus } from '@/types/app.types';

export { buildQuoteMessage, quoteEmail, quotePhone } from '@/lib/finance/quoteMessage';

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
  'sent_at, revision, last_sent_revision, reopened_at, reopen_reason, last_edit_note, ' +
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

/** Minimal quote lookup by application_id — links an application to its auto-generated draft. */
export async function fetchQuoteByApplicationId(
  applicationId: string,
): Promise<{ id: string; quote_number: string | null } | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('quotes')
    .select('id, quote_number')
    .eq('application_id', applicationId)
    .limit(1);
  if (error) throw new Error(error.message);
  return (data?.[0] as { id: string; quote_number: string | null } | undefined) ?? null;
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

  let clientId = header.client_id;
  let historicalName = header.historical_client_name ?? null;
  if (header.application_id) {
    const linked = await resolveClientForApplicationQuote(
      header.application_id,
      header.client_id,
    );
    clientId = linked.clientId;
    if (clientId) historicalName = null;
    else if (!historicalName) historicalName = linked.historicalName;
  }

  const { data, error } = await supabase
    .from('quotes')
    .insert({
      client_id: clientId,
      historical_client_name: historicalName,
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

/** Updates a quote's header + fully replaces its line items. Status-gated. */
export async function updateQuote(
  id: string,
  header: QuoteHeaderInput,
  items: LineItemInput[],
  opts?: { changeNote?: string | null },
): Promise<void> {
  const supabase = requireSupabase();

  const { data: existing, error: loadErr } = await supabase
    .from('quotes')
    .select('id, status, converted_invoice_id')
    .eq('id', id)
    .maybeSingle();
  if (loadErr) throw new Error(loadErr.message);
  if (!existing) throw new Error('Quote not found.');

  const gate = assertQuoteEditable({
    status: existing.status as QuoteStatus,
    converted_invoice_id: existing.converted_invoice_id,
  });
  if (!gate.ok) throw new Error(gate.error);

  const changeNote = opts?.changeNote?.trim() || null;
  if (changeNote) {
    await supabase.rpc('set_audit_change_note' as never, { p_note: changeNote } as never);
  }

  const { rows, subtotal } = priceItems(items);
  const discount = round2(header.discount ?? 0);
  const total = Math.max(round2(subtotal - discount), 0);

  const { error } = await supabase
    .from('quotes')
    .update({
      client_id: header.client_id,
      historical_client_name: header.historical_client_name ?? null,
      application_id: header.application_id ?? null,
      status: gate.nextStatus,
      subtotal,
      discount,
      total,
      notes: header.notes ?? null,
      valid_until: header.valid_until ?? null,
      last_edit_note: changeNote,
      updated_at: new Date().toISOString(),
    } as never)
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

/** Reopen an accepted quote so it can be edited. */
export async function reopenQuote(id: string, reason: string): Promise<void> {
  const supabase = requireSupabase();
  const trimmed = reason.trim();
  if (!trimmed) throw new Error('A reason is required to reopen an accepted quote.');

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existing, error: loadErr } = await supabase
    .from('quotes')
    .select('id, status, converted_invoice_id')
    .eq('id', id)
    .maybeSingle();
  if (loadErr) throw new Error(loadErr.message);
  if (!existing) throw new Error('Quote not found.');
  if (existing.converted_invoice_id) {
    throw new Error('This quote has been converted to an invoice and cannot be reopened.');
  }
  if (existing.status !== 'accepted') {
    throw new Error('Only accepted quotes need to be reopened.');
  }

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('quotes')
    .update({
      status: 'sent',
      reopened_at: now,
      reopened_by: user?.id ?? null,
      reopen_reason: trimmed,
      updated_at: now,
    } as never)
    .eq('id', id);
  if (error) throw new Error(error.message);
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
