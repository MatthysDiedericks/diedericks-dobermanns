import { requireSupabase } from '@/lib/supabase';
import type { InvoicePayment } from '@/types/finance';

export type ClientPaymentRow = {
  id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  method: string | null;
  reference: string | null;
  invoice_number: string;
};

/** Map a `payments` row to the InvoicePayment UI shape. */
export function mapPaymentRow(p: Record<string, unknown>): InvoicePayment {
  return {
    id: p.id as string,
    invoice_id: p.invoice_id as string,
    amount: Number(p.amount),
    payment_date: String(p.paid_at).slice(0, 10),
    payment_method: (p.method as string | null) ?? null,
    reference: (p.reference as string | null) ?? null,
    notes: (p.notes as string | null) ?? null,
    recorded_by: (p.recorded_by as string | null) ?? null,
    created_at: (p.created_at as string) ?? '',
    proof_document_id: (p.proof_document_id as string | null) ?? null,
  };
}

export async function fetchInvoicePayments(invoiceId: string): Promise<InvoicePayment[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('payments')
    .select(
      'id, invoice_id, amount, paid_at, method, reference, notes, recorded_by, created_at, proof_document_id',
    )
    .eq('invoice_id', invoiceId)
    .order('paid_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => mapPaymentRow(p as Record<string, unknown>));
}

/** Client payment ledger rows from live `payments` (not invoice_payments). */
export async function fetchClientPayments(clientId: string): Promise<ClientPaymentRow[]> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('payments')
    .select('id, invoice_id, amount, paid_at, method, reference, invoices(invoice_number)')
    .eq('client_id', clientId)
    .order('paid_at', { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    const inv = r.invoices as { invoice_number: string } | null;
    return {
      id: r.id as string,
      invoice_id: r.invoice_id as string,
      amount: Number(r.amount),
      payment_date: String(r.paid_at).slice(0, 10),
      method: (r.method as string | null) ?? null,
      reference: (r.reference as string | null) ?? null,
      invoice_number: inv?.invoice_number ?? '',
    };
  });
}
