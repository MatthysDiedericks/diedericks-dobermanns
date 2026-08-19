import { requireSupabase } from '@/lib/supabase';

export async function verifyPaymentProof(input: {
  documentId: string;
  invoiceId: string;
  amount: number;
  paymentDate: string;
  method: string;
  reference?: string | null;
}): Promise<string> {
  const supabase = requireSupabase();
  const { data, error } = await supabase.rpc('verify_payment_proof' as never, {
    p_document_id: input.documentId,
    p_invoice_id: input.invoiceId,
    p_amount: input.amount,
    p_payment_date: input.paymentDate,
    p_method: input.method,
    p_reference: input.reference ?? null,
  } as never);
  if (error) throw new Error(error.message);
  return data as string;
}

export async function fetchPendingPaymentProofs() {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('documents')
    .select(
      'id, document_name, uploaded_at, related_quote_id, related_invoice_id, original_filename, storage_path, entity_id',
    )
    .eq('category', 'proof_of_payment')
    .eq('review_status', 'pending')
    .order('uploaded_at', { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function countPendingPaymentProofs(): Promise<number> {
  const supabase = requireSupabase();
  const { count, error } = await supabase
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('category', 'proof_of_payment')
    .eq('review_status', 'pending');
  if (error) throw new Error(error.message);
  return count ?? 0;
}
