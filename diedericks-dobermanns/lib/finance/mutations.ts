import { supabase } from '@/lib/supabase';
import { callNotify } from '@/lib/functions';
import { formatPrice } from '@/lib/format';
import type { InvoiceStatus, LineItemType, Quote, QuoteStatus } from '@/types/app.types';
import type { TablesInsert, TablesUpdate } from '@/types/database.types';

import { simulate, type MutationResult, type SaveResult } from '@/lib/shared/mutationTypes';

export interface LineItemInput {
  item_type: LineItemType;
  dog_id?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Prices line items and returns rows ready for insert, plus the subtotal. */
function priceItems(items: LineItemInput[]) {
  const rows = items.map((it, i) => ({
    item_type: it.item_type,
    dog_id: it.dog_id ?? null,
    description: it.description.trim(),
    quantity: it.quantity,
    unit_price: round2(it.unit_price),
    line_total: round2(it.quantity * it.unit_price),
    sort_order: i,
  }));
  const subtotal = round2(rows.reduce((s, it) => s + it.line_total, 0));
  return { rows, subtotal };
}

export interface QuoteHeaderInput {
  client_id: string | null;
  application_id?: string | null;
  status?: QuoteStatus;
  notes?: string | null;
  valid_until?: string | null;
  discount?: number;
  quote_number?: string | null;
}

/** Creates or updates a quote together with its line items. */
export async function saveQuote(
  header: QuoteHeaderInput,
  items: LineItemInput[],
  id?: string,
): Promise<SaveResult> {
  const { rows, subtotal } = priceItems(items);
  const discount = round2(header.discount ?? 0);
  const total = Math.max(round2(subtotal - discount), 0);

  if (!supabase) {
    await new Promise((r) => setTimeout(r, 500));
    return { error: null, id: id ?? `demo-${Date.now()}` };
  }

  const row: TablesInsert<'quotes'> = {
    client_id: header.client_id,
    application_id: header.application_id ?? null,
    status: header.status ?? 'draft',
    currency: 'ZAR',
    subtotal,
    discount,
    total,
    notes: header.notes ?? null,
    valid_until: header.valid_until ?? null,
    quote_number: header.quote_number ?? null,
  };

  let quoteId = id ?? null;
  if (id) {
    const { error } = await supabase
      .from('quotes')
      .update(row as TablesUpdate<'quotes'>)
      .eq('id', id);
    if (error) return { error: error.message, id };
  } else {
    const { data, error } = await supabase.from('quotes').insert(row).select('id').single();
    if (error) return { error: error.message, id: null };
    quoteId = (data as { id: string }).id;
  }

  if (quoteId) {
    await supabase.from('quote_items').delete().eq('quote_id', quoteId);
    if (rows.length) {
      const itemRows = rows.map((it) => ({ ...it, quote_id: quoteId as string }));
      const { error } = await supabase.from('quote_items').insert(itemRows);
      if (error) return { error: error.message, id: quoteId };
    }
  }
  return { error: null, id: quoteId };
}

export async function updateQuoteStatus(
  id: string,
  status: QuoteStatus,
): Promise<MutationResult> {
  if (!supabase) return simulate();
  const { error } = await supabase.from('quotes').update({ status }).eq('id', id);
  return { error: error?.message ?? null };
}

export async function deleteQuote(id: string): Promise<MutationResult> {
  if (!supabase) return simulate();
  const { error } = await supabase.from('quotes').delete().eq('id', id);
  return { error: error?.message ?? null };
}

/** Generates an invoice (with items) from an existing quote. */
export async function createInvoiceFromQuote(quote: Quote): Promise<SaveResult> {
  if (!supabase) {
    await new Promise((r) => setTimeout(r, 500));
    return { error: null, id: `demo-${Date.now()}` };
  }
  const today = new Date().toISOString().slice(0, 10);
  const row: TablesInsert<'invoices'> = {
    client_id: quote.client_id,
    status: 'sent',
    currency: quote.currency,
    subtotal: quote.subtotal,
    discount_amount: quote.discount,
    total_amount: quote.total,
    amount_paid: 0,
    notes: quote.notes,
    issue_date: today,
    due_date: quote.valid_until ?? null,
    invoice_number: '',
  };
  const { data, error } = await supabase.from('invoices').insert(row).select('id, client_id, invoice_number, total_amount').single();
  if (error) return { error: error.message, id: null };
  const invoiceId = (data as { id: string }).id;
  const invoiceRow = data as { id: string; client_id: string | null; invoice_number: string | null; total_amount: number };
  const items = quote.items ?? [];
  if (items.length) {
    const itemRows = items.map((it, i) => ({
      invoice_id: invoiceId,
      item_type: it.item_type,
      description: it.description,
      quantity: it.quantity,
      unit_price: it.unit_price,
      sort_order: i,
    }));
    const { error: itemErr } = await supabase.from('invoice_items').insert(itemRows);
    if (itemErr) return { error: itemErr.message, id: invoiceId };
  }
  await supabase.from('quotes').update({ status: 'accepted' }).eq('id', quote.id);

  if (invoiceRow.client_id) {
    const number = invoiceRow.invoice_number || invoiceId.slice(0, 8).toUpperCase();
    void callNotify({
      userId: invoiceRow.client_id,
      title: 'New Invoice',
      body: `Invoice #${number} for ${formatPrice(invoiceRow.total_amount)} is ready to view.`,
    });
  }

  return { error: null, id: invoiceId };
}

/** Records a payment against an invoice via invoice_payments (trigger syncs invoice). */
export async function recordInvoicePayment(
  id: string,
  amountPaid: number,
  _total: number,
): Promise<MutationResult> {
  if (!supabase) return simulate();
  const paid = round2(amountPaid);
  const { error } = await supabase.from('invoice_payments').insert({
    invoice_id: id,
    amount: paid,
    payment_date: new Date().toISOString().slice(0, 10),
  });
  return { error: error?.message ?? null };
}

export async function updateInvoiceStatus(
  id: string,
  status: InvoiceStatus,
): Promise<MutationResult> {
  if (!supabase) return simulate();
  const { error } = await supabase.from('invoices').update({ status }).eq('id', id);
  return { error: error?.message ?? null };
}
