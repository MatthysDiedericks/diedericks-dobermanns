import { useCallback, useEffect, useState } from 'react';

import {
  fetchAllInvoices,
  fetchInvoiceById,
} from '@/lib/finance/queries';
import { callNotify } from '@/lib/functions';
import { formatPrice } from '@/lib/format';
import { requireSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { DraftLineItem, InvoiceListRow, InvoiceWithDetails } from '@/types/finance';

export function useInvoices(statusFilter?: string) {
  const [data, setData] = useState<InvoiceListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchAllInvoices(statusFilter);
      setData(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useInvoiceDetail(id: string) {
  const [invoice, setInvoice] = useState<InvoiceWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const row = await fetchInvoiceById(id);
      setInvoice(row);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load invoice');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { invoice, loading, error, refresh };
}

interface CreateInvoiceInput {
  /** Exactly one of client_id / historical_client_name should be set — mirrors quotes. */
  client_id: string | null;
  historical_client_name?: string | null;
  reservation_id?: string | null;
  dog_id?: string | null;
  litter_id?: string | null;
  issue_date: string;
  due_date: string;
  notes?: string;
  internal_notes?: string;
  discount_amount: number;
  items: DraftLineItem[];
  send?: boolean;
}

export async function createInvoice(input: CreateInvoiceInput) {
  const supabase = requireSupabase();
  const subtotal = input.items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const total_amount = Math.max(subtotal - input.discount_amount, 0);

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      client_id: input.client_id,
      historical_client_name: input.historical_client_name ?? null,
      reservation_id: input.reservation_id ?? null,
      dog_id: input.dog_id ?? null,
      litter_id: input.litter_id ?? null,
      issue_date: input.issue_date,
      due_date: input.due_date,
      notes: input.notes ?? null,
      internal_notes: input.internal_notes ?? null,
      subtotal,
      discount_amount: input.discount_amount,
      total_amount,
      status: input.send ? 'sent' : 'draft',
      invoice_number: '',
    })
    .select('id, client_id, invoice_number, total_amount')
    .single();

  if (error) throw new Error(error.message);

  const itemRows = input.items.map((item, idx) => ({
    invoice_id: invoice.id,
    description: item.description,
    item_type: item.item_type,
    quantity: item.quantity,
    unit_price: item.unit_price,
    sort_order: idx,
  }));

  const { error: itemsError } = await supabase.from('invoice_items').insert(itemRows);
  if (itemsError) throw new Error(itemsError.message);

  if (input.send && invoice.client_id) {
    const number = invoice.invoice_number || invoice.id.slice(0, 8).toUpperCase();
    void callNotify({
      userId: invoice.client_id,
      title: 'New Invoice',
      body: `Invoice #${number} for ${formatPrice(invoice.total_amount)} is ready to view.`,
    });
  }

  return invoice.id;
}

export async function recordInvoicePayment(
  invoiceId: string,
  amount: number,
  paymentDate: string,
  method?: string,
  reference?: string,
) {
  const supabase = requireSupabase();
  const profileId = useAuthStore.getState().profile?.id;

  const { error } = await supabase.from('invoice_payments').insert({
    invoice_id: invoiceId,
    amount,
    payment_date: paymentDate,
    payment_method: method ?? null,
    reference: reference ?? null,
    recorded_by: profileId ?? null,
  });

  if (error) throw new Error(error.message);
}

export async function updateInvoiceStatus(invoiceId: string, status: string) {
  const supabase = requireSupabase();

  if (status === 'sent') {
    const { data: invoice } = await supabase
      .from('invoices')
      .select('client_id, invoice_number, total_amount')
      .eq('id', invoiceId)
      .single();

    const { error } = await supabase.from('invoices').update({ status }).eq('id', invoiceId);
    if (error) throw new Error(error.message);

    if (invoice?.client_id) {
      const number = invoice.invoice_number || invoiceId.slice(0, 8).toUpperCase();
      void callNotify({
        userId: invoice.client_id,
        title: 'New Invoice',
        body: `Invoice #${number} for ${formatPrice(invoice.total_amount)} is ready to view.`,
      });
    }
    return;
  }

  const { error } = await supabase.from('invoices').update({ status }).eq('id', invoiceId);
  if (error) throw new Error(error.message);
}
