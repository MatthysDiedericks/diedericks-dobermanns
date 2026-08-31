import { fetchMyFinancialClientIds } from '@/lib/portal/memberScope';
import { fetchInvoiceById } from '@/lib/finance/queries';
import { requireSupabase } from '@/lib/supabase';
import type { InvoiceWithDetails } from '@/types/finance';

/** One invoice for this client. Unscoped fetchInvoiceById would return any row under admin RLS. */
export async function fetchMyClientInvoiceById(
  id: string,
  clientId: string,
): Promise<InvoiceWithDetails | null> {
  const supabase = requireSupabase();
  const ids = await fetchMyFinancialClientIds();
  const { data, error } = await supabase
    .from('invoices')
    .select('id')
    .eq('id', id)
    .in('client_id', ids)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return fetchInvoiceById(id);
}
