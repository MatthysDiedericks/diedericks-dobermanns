import type { LineItemInput } from '@/lib/finance/mutations';
import { assertQuoteEditable } from '@/lib/finance/quoteEditGuards';
import { resolveQuoteBuyer } from '@/lib/finance/resolveQuoteBuyer';
import { subjectColumnsForSave } from '@/lib/finance/quoteSubjectSave';
import { invoiceFieldsFromJoin } from '@/lib/finance/quoteBalance';
import { throwQuoteDb } from '@/lib/finance/quoteErrors';
import { getCachedUser } from '@/lib/auth/getCachedUser';
import { requireSupabase } from '@/lib/supabase';
import type { Quote, QuoteStatus } from '@/types/app.types';

export { buildQuoteMessage, quoteEmail, quotePhone } from '@/lib/finance/quoteMessage';

const round2 = (n: number) => Math.round(n * 100) / 100;

const QUOTE_SELECT =
  'id, quote_number, client_id, contact_id, historical_client_name, application_id, status, currency, subtotal, discount, total, ' +
  'notes, valid_until, converted_invoice_id, created_by, created_at, updated_at, ' +
  'sent_at, revision, last_sent_revision, reopened_at, reopen_reason, last_edit_note, ' +
  'delivery_decision, delivery_note, quote_type, ' +
  'lapse_hold_until, lapse_hold_reason, last_client_activity_at, ' +
  'reminder_first_sent_at, reminder_final_sent_at, lapsed_at, lapse_reason, ' +
  'client:users!quotes_client_id_fkey(id, full_name, phone, email), ' +
  'contact:contacts!quotes_contact_id_fkey(full_name, email, phone, merged_into_contact_id), ' +
  'application:applications(email, phone), ' +
  'items:quote_items(id, item_type, dog_id, litter_id, subject_kind, description, quantity, unit_price, line_total, sort_order, catalogue_code), ' +
  'invoices!invoices_quote_id_fkey(amount_outstanding, amount_paid, total_amount)';

export interface QuoteHeaderInput {
  client_id: string | null;
  contact_id?: string | null;
  historical_client_name?: string | null;
  buyer_kind?: 'applicant' | 'user' | 'contact' | 'walkin';
  buyer_id?: string | null;
  application_id?: string | null;
  status?: QuoteStatus;
  notes?: string | null;
  valid_until?: string | null;
  discount?: number;
  delivery_decision?:
    | 'collection'
    | 'included'
    | 'charged'
    | 'to_be_confirmed'
    | 'not_applicable'
    | null;
  delivery_note?: string | null;
  walkin_email?: string | null;
  walkin_phone?: string | null;
  quote_type?: string | null;
}

/** Prices line items and returns rows ready for insert, plus the subtotal. */
function priceItems(items: LineItemInput[]) {
  const rows = items.map((it, i) => ({
    item_type: it.item_type,
    ...subjectColumnsForSave(it),
    description: it.description.trim(),
    quantity: it.quantity,
    unit_price: round2(it.unit_price),
    sort_order: i,
    catalogue_code: it.catalogue_code ?? null,
  }));
  const subtotal = round2(rows.reduce((s, it) => s + it.quantity * it.unit_price, 0));
  return { rows, subtotal };
}

export async function fetchAllQuotes(userId: string, statusFilter?: string): Promise<Quote[]> {
  if (!userId) throw new Error('Not signed in');
  const supabase = requireSupabase();
  let query = supabase.from('quotes').select(QUOTE_SELECT).order('created_at', { ascending: false });
  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const r = row as unknown as Quote & { invoices?: unknown };
    return { ...r, ...invoiceFieldsFromJoin(r.invoices) };
  });
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

export async function fetchQuoteById(id: string, userId: string): Promise<Quote> {
  if (!userId) throw new Error('Not signed in');
  const supabase = requireSupabase();
  const { data, error } = await supabase.from('quotes').select(QUOTE_SELECT).eq('id', id).single();
  if (error) throw new Error(error.message);
  const r = data as unknown as Quote & { invoices?: unknown };
  return { ...r, ...invoiceFieldsFromJoin(r.invoices) };
}

export async function createQuote(header: QuoteHeaderInput, items: LineItemInput[]): Promise<string> {
  const supabase = requireSupabase();
  const { rows, subtotal } = priceItems(items);
  const discount = round2(header.discount ?? 0);
  const total = Math.max(round2(subtotal - discount), 0);

  const linked = await resolveQuoteBuyer({
    kind:
      header.buyer_kind ??
      (header.application_id
        ? 'applicant'
        : header.client_id
          ? 'user'
          : header.contact_id
            ? 'contact'
            : 'walkin'),
    id: header.buyer_id ?? header.application_id ?? header.client_id ?? header.contact_id,
    applicationId: header.application_id,
    walkinName: header.historical_client_name,
    walkinEmail: header.walkin_email,
    walkinPhone: header.walkin_phone,
  });

  const { data, error } = await supabase
    .from('quotes')
    .insert({
      client_id: linked.clientId,
      contact_id: linked.contactId,
      historical_client_name: linked.historicalName,
      quote_type: header.quote_type ?? 'dog_sale',
      application_id: header.application_id ?? null,
      status: header.status ?? 'draft',
      currency: 'ZAR',
      subtotal,
      discount,
      total,
      notes: header.notes ?? null,
      valid_until: header.valid_until ?? null,
      delivery_decision: header.delivery_decision ?? null,
      delivery_note: header.delivery_note ?? null,
    })
    .select('id')
    .single();
  if (error) throwQuoteDb('insert_quote', error);
  const quoteId = (data as { id: string }).id;

  if (rows.length) {
    const itemRows = rows.map((it) => ({ ...it, quote_id: quoteId }));
    const { error: itemErr } = await supabase.from('quote_items').insert(itemRows);
    if (itemErr) throwQuoteDb('insert_items', itemErr);
  }
  return quoteId;
}

export async function updateQuote(
  id: string,
  header: QuoteHeaderInput,
  items: LineItemInput[],
  opts?: { changeNote?: string | null },
): Promise<void> {
  const supabase = requireSupabase();

  const { data: existing, error: loadErr } = await supabase
    .from('quotes')
    .select('id, status, converted_invoice_id, contact_id')
    .eq('id', id)
    .maybeSingle();
  if (loadErr) throwQuoteDb('load', loadErr);
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

  const linked = await resolveQuoteBuyer({
    kind:
      header.buyer_kind ??
      (header.application_id
        ? 'applicant'
        : header.client_id
          ? 'user'
          : header.contact_id
            ? 'contact'
            : 'walkin'),
    id: header.buyer_id ?? header.application_id ?? header.client_id ?? header.contact_id,
    applicationId: header.application_id,
    walkinName: header.historical_client_name,
    walkinEmail: header.walkin_email,
    walkinPhone: header.walkin_phone,
    existingContactId: existing.contact_id,
  });

  const { error } = await supabase
    .from('quotes')
    .update({
      client_id: linked.clientId,
      contact_id: linked.contactId,
      historical_client_name: linked.historicalName,
      quote_type: header.quote_type ?? 'dog_sale',
      application_id: header.application_id ?? null,
      status: gate.nextStatus,
      subtotal,
      discount,
      total,
      notes: header.notes ?? null,
      valid_until: header.valid_until ?? null,
      delivery_decision: header.delivery_decision ?? null,
      delivery_note: header.delivery_note ?? null,
      last_edit_note: changeNote,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', id);
  if (error) throwQuoteDb('update_quote', error);

  const { error: delErr } = await supabase.from('quote_items').delete().eq('quote_id', id);
  if (delErr) throwQuoteDb('replace_items', delErr);
  if (rows.length) {
    const itemRows = rows.map((it) => ({ ...it, quote_id: id }));
    const { error: itemErr } = await supabase.from('quote_items').insert(itemRows);
    if (itemErr) throwQuoteDb('insert_items', itemErr);
  }
}

/** Reopen an accepted quote so it can be edited. */
export async function reopenQuote(id: string, reason: string): Promise<void> {
  const supabase = requireSupabase();
  const trimmed = reason.trim();
  if (!trimmed) throw new Error('A reason is required to reopen an accepted quote.');
  const user = await getCachedUser();
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
  if (status === 'cancelled') {
    const { flagWaitlistQuoteCancelled } = await import('@/lib/waitlist/stageAdvance');
    const { error: flagErr } = await flagWaitlistQuoteCancelled(id);
    if (flagErr) console.error('[updateQuoteStatus] waitlist flag:', flagErr);
  }
}

export async function convertQuoteToInvoice(quoteId: string): Promise<string> {
  const supabase = requireSupabase();
  const { data: quote } = await supabase
    .from('quotes')
    .select('contact_id, client_id')
    .eq('id', quoteId)
    .maybeSingle();
  if (quote && !quote.contact_id && !quote.client_id) {
    throw new Error('Link a buyer before converting this quote to an invoice.');
  }
  const { data, error } = await supabase.rpc('convert_quote_to_invoice', { p_quote_id: quoteId });
  if (error) throw new Error(error.message);
  const { reserveDogsFromQuote } = await import('@/lib/finance/reserveQuotedDogs');
  const reserved = await reserveDogsFromQuote(supabase, quoteId);
  if (reserved.error) console.error('[convertQuoteToInvoice] reserve:', reserved.error);
  return data as string;
}
