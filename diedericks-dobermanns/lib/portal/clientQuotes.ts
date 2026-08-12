import { requireSupabase } from '@/lib/supabase';

export type ClientQuoteListRow = {
  id: string;
  quote_number: string;
  status: string;
  total: number;
  currency: string;
  valid_until: string | null;
  sent_at: string | null;
  created_at: string;
  last_sent_revision: number | null;
  revision: number | null;
};

export type ClientQuoteDetail = ClientQuoteListRow & {
  notes: string | null;
  subtotal: number;
  discount: number;
  items: {
    description: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }[];
};

/** Non-draft quotes visible to the signed-in client (RLS). */
export async function fetchMyClientQuotes(): Promise<ClientQuoteListRow[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('quotes')
    .select(
      'id, quote_number, status, total, currency, valid_until, sent_at, created_at, last_sent_revision, revision',
    )
    .neq('status', 'draft')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as ClientQuoteListRow[]).map((q) => ({
    ...q,
    total: Number(q.total),
  }));
}

export async function fetchMyClientQuoteById(id: string): Promise<ClientQuoteDetail | null> {
  const supabase = requireSupabase();
  const { data: quote, error } = await supabase
    .from('quotes')
    .select(
      'id, quote_number, status, total, currency, valid_until, sent_at, created_at, last_sent_revision, revision, notes, subtotal, discount',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!quote) return null;

  const { data: items, error: itemsErr } = await supabase
    .from('quote_items')
    .select('description, quantity, unit_price, line_total')
    .eq('quote_id', id)
    .order('sort_order');
  if (itemsErr) throw new Error(itemsErr.message);

  const row = quote as unknown as ClientQuoteDetail;
  return {
    ...row,
    total: Number(row.total),
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    items: ((items ?? []) as ClientQuoteDetail['items']).map((it) => ({
      ...it,
      quantity: Number(it.quantity),
      unit_price: Number(it.unit_price),
      line_total: Number(it.line_total),
    })),
  };
}
