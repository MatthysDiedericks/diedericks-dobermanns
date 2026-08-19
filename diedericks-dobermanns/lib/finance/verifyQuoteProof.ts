import { convertQuoteToInvoice } from '@/lib/finance/quoteQueries';
import { verifyPaymentProof } from '@/lib/finance/verifyPaymentProof';
import { requireSupabase } from '@/lib/supabase';

/** Convert if needed, then record the amount on the proof — never the full quote total. */
export async function verifyQuotePaymentProof(input: {
  quoteId: string;
  documentId: string;
  amount: number;
  paymentDate: string;
  method: string;
  reference?: string;
}): Promise<{ invoiceId: string; paymentId: string }> {
  const supabase = requireSupabase();
  const { data: quote, error } = await supabase
    .from('quotes')
    .select('id, converted_invoice_id, contact_id, client_id')
    .eq('id', input.quoteId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!quote) throw new Error('Quote not found.');
  if (!quote.contact_id && !quote.client_id) {
    throw new Error('Link a buyer before converting this quote.');
  }

  let invoiceId = quote.converted_invoice_id;
  if (!invoiceId) {
    invoiceId = await convertQuoteToInvoice(input.quoteId);
  }

  const paymentId = await verifyPaymentProof({
    documentId: input.documentId,
    invoiceId,
    amount: input.amount,
    paymentDate: input.paymentDate,
    method: input.method,
    reference: input.reference,
  });
  return { invoiceId, paymentId };
}
