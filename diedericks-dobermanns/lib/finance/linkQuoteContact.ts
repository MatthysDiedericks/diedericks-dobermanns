import { findOrCreateContactFromApplication } from '@/lib/finance/resolveQuoteBuyer';
import { requireSupabase } from '@/lib/supabase';

/** Attach a contacts row from the quote's application. Drafts may wait; sent quotes may not. */
export async function linkQuoteContactFromApplication(quoteId: string): Promise<string> {
  const supabase = requireSupabase();
  const { data: quote, error } = await supabase
    .from('quotes')
    .select('id, contact_id, application_id')
    .eq('id', quoteId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!quote) throw new Error('Quote not found.');
  if (quote.contact_id) return quote.contact_id;
  if (!quote.application_id) {
    throw new Error('This quote has no application to copy a contact from.');
  }
  const contactId = await findOrCreateContactFromApplication(quote.application_id);
  const { error: updErr } = await supabase
    .from('quotes')
    .update({ contact_id: contactId, updated_at: new Date().toISOString() })
    .eq('id', quoteId);
  if (updErr) throw new Error(updErr.message);
  return contactId;
}
