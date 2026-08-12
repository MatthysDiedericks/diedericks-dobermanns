import { requireSupabase } from '@/lib/supabase';

export type QuoteRevisionRow = {
  id: string;
  quote_id: string;
  revision: number;
  snapshot: {
    quote_number?: string;
    revision?: number;
    items?: {
      description: string;
      quantity: number;
      unit_price: number;
      line_total: number;
      sort_order?: number;
    }[];
    total?: number;
  };
  subtotal: number;
  discount: number;
  total: number;
  sent_at: string | null;
  sent_to: string | null;
  change_note: string | null;
  created_at: string;
};

export async function fetchQuoteRevisions(quoteId: string): Promise<QuoteRevisionRow[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('quote_revisions' as never)
    .select(
      'id, quote_id, revision, snapshot, subtotal, discount, total, sent_at, sent_to, change_note, created_at',
    )
    .eq('quote_id' as never, quoteId)
    .order('revision' as never, { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as QuoteRevisionRow[]).map((r) => ({
    ...r,
    subtotal: Number(r.subtotal),
    discount: Number(r.discount),
    total: Number(r.total),
  }));
}

/** Snapshot current quote + items into quote_revisions and bump revision on resend. */
export async function recordQuoteSendRevision(input: {
  quoteId: string;
  sentTo: string | null;
  changeNote: string | null;
  actorId: string | null;
}): Promise<{ revision: number }> {
  const supabase = requireSupabase();
  const { data: quote, error } = await supabase
    .from('quotes')
    .select(
      'id, quote_number, revision, last_sent_revision, status, currency, subtotal, discount, total, notes, valid_until, client_id, historical_client_name, application_id, sent_at',
    )
    .eq('id', input.quoteId)
    .single();
  if (error) throw new Error(error.message);

  const header = quote as unknown as {
    quote_number: string;
    revision: number | null;
    last_sent_revision: number | null;
    status: string;
    currency: string;
    subtotal: number;
    discount: number;
    total: number;
    notes: string | null;
    valid_until: string | null;
    client_id: string | null;
    historical_client_name: string | null;
    application_id: string | null;
    sent_at: string | null;
  };

  const { data: items, error: itemsErr } = await supabase
    .from('quote_items')
    .select('item_type, dog_id, description, quantity, unit_price, line_total, sort_order')
    .eq('quote_id', input.quoteId)
    .order('sort_order');
  if (itemsErr) throw new Error(itemsErr.message);

  const previouslySent = Boolean(header.sent_at) || Boolean(header.last_sent_revision);
  const nextRevision = previouslySent
    ? (header.revision ?? 1) + 1
    : Math.max(header.revision ?? 1, 1);
  const now = new Date().toISOString();

  const snapshot = {
    quote_number: header.quote_number,
    revision: nextRevision,
    status: 'sent',
    currency: header.currency,
    subtotal: Number(header.subtotal),
    discount: Number(header.discount),
    total: Number(header.total),
    notes: header.notes,
    valid_until: header.valid_until,
    client_id: header.client_id,
    historical_client_name: header.historical_client_name,
    application_id: header.application_id,
    sent_at: now,
    items: (items ?? []).map((it) => ({
      ...it,
      quantity: Number(it.quantity),
      unit_price: Number(it.unit_price),
      line_total: Number(it.line_total),
      sort_order: Number(it.sort_order),
    })),
  };

  const { error: insErr } = await supabase.from('quote_revisions' as never).insert({
    quote_id: input.quoteId,
    revision: nextRevision,
    snapshot: snapshot as never,
    subtotal: Number(header.subtotal),
    discount: Number(header.discount),
    total: Number(header.total),
    sent_at: now,
    sent_to: input.sentTo,
    change_note: input.changeNote,
    created_by: input.actorId,
  } as never);
  if (insErr) throw new Error(insErr.message);

  const { error: updErr } = await supabase
    .from('quotes')
    .update({
      status: 'sent',
      sent_at: now,
      revision: nextRevision,
      last_sent_revision: nextRevision,
      updated_at: now,
    } as never)
    .eq('id', input.quoteId);
  if (updErr) throw new Error(updErr.message);

  return { revision: nextRevision };
}
