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

export function mapInvoicePaymentRow(p: Record<string, unknown>): InvoicePayment {
  return {
    id: p.id as string,
    invoice_id: p.invoice_id as string,
    amount: Number(p.amount),
    payment_date: String(p.payment_date).slice(0, 10),
    payment_method: (p.payment_method as string | null) ?? null,
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
    .from('invoice_payments')
    .select(
      'id, invoice_id, amount, payment_date, payment_method, reference, notes, recorded_by, created_at, proof_document_id',
    )
    .eq('invoice_id', invoiceId)
    .order('payment_date', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => mapInvoicePaymentRow(p as Record<string, unknown>));
}

/** Same receipts ledger the website statement reads. */
export async function fetchClientPayments(clientId: string): Promise<ClientPaymentRow[]> {
  const supabase = requireSupabase();
  const { data: invoices, error: invErr } = await supabase
    .from('invoices')
    .select('id, invoice_number')
    .eq('client_id', clientId);
  if (invErr) throw new Error(invErr.message);
  const ids = (invoices ?? []).map((i) => i.id);
  if (!ids.length) return [];
  const numbers = new Map((invoices ?? []).map((i) => [i.id, i.invoice_number]));

  const { data, error } = await supabase
    .from('invoice_payments')
    .select('id, invoice_id, amount, payment_date, payment_method, reference')
    .in('invoice_id', ids)
    .order('payment_date', { ascending: true });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    invoice_id: row.invoice_id,
    amount: Number(row.amount),
    payment_date: String(row.payment_date).slice(0, 10),
    method: row.payment_method,
    reference: row.reference,
    invoice_number: numbers.get(row.invoice_id) ?? '',
  }));
}
