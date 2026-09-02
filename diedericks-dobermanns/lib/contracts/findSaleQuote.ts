import { requireSupabase } from '@/lib/supabase';

export type SaleQuoteRef = { quoteId: string | null; invoiceId: string | null };

type QuoteLite = {
  id: string;
  converted_invoice_id: string | null;
  status: string;
};

function pickQuote(rows: QuoteLite[]): SaleQuoteRef {
  const q =
    rows.find((r) => r.status === 'accepted') ??
    rows.find((r) => r.status !== 'cancelled' && r.status !== 'expired') ??
    null;
  return { quoteId: q?.id ?? null, invoiceId: q?.converted_invoice_id ?? null };
}

/** Quote/invoice for this sale — line item first, then the buyer's open quote. */
export async function findSaleQuoteInvoice(input: {
  dogId: string;
  contactId: string | null;
  clientId: string | null;
}): Promise<SaleQuoteRef> {
  const supabase = requireSupabase();
  const { data: items } = await supabase
    .from('quote_items')
    .select('quote_id, quote:quotes!quote_items_quote_id_fkey(id, converted_invoice_id, status)')
    .eq('dog_id', input.dogId)
    .order('sort_order');
  const fromItem = pickQuote(
    ((items ?? []) as unknown as { quote: QuoteLite | null }[])
      .map((r) => r.quote)
      .filter((q): q is QuoteLite => !!q),
  );
  if (fromItem.quoteId) return fromItem;

  if (!input.contactId && !input.clientId) return { quoteId: null, invoiceId: null };

  let q = supabase
    .from('quotes')
    .select('id, converted_invoice_id, status')
    .not('status', 'in', '(cancelled,expired)')
    .order('created_at', { ascending: false })
    .limit(10);
  if (input.contactId && input.clientId) {
    q = q.or(`contact_id.eq.${input.contactId},client_id.eq.${input.clientId}`);
  } else if (input.contactId) {
    q = q.eq('contact_id', input.contactId);
  } else if (input.clientId) {
    q = q.eq('client_id', input.clientId);
  }
  const { data } = await q;
  return pickQuote((data ?? []) as QuoteLite[]);
}
