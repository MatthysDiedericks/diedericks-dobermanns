import { useCallback, useEffect, useState } from 'react';

import { buildObjectPath, uploadFile } from '@/lib/storage';
import { requireSupabase, supabase } from '@/lib/supabase';

export interface TransactionItem {
  id?: string;
  dog_id?: string | null;
  description: string;
  amount_cents: number;
  tax_cents: number;
}

export interface LitterTransaction {
  id: string;
  litter_id: string | null;
  transaction_date: string;
  transaction_type: 'income' | 'expense';
  category: string | null;
  currency: string;
  amounts_tax_mode: string | null;
  invoice_number: string | null;
  notes: string | null;
  attachment_path: string | null;
  subtotal_cents: number;
  tax_cents: number;
  total_cents: number;
  items: TransactionItem[];
}

export function formatZar(cents: number): string {
  return `R ${(cents / 100).toFixed(2).replace('.', ',')}`;
}

export function useLitterFinancials(litterId: string) {
  const [transactions, setTransactions] = useState<LitterTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!litterId || !supabase) {
      setTransactions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const client = requireSupabase();
    const { data: txs } = await client
      .from('litter_transactions')
      .select('*')
      .eq('litter_id', litterId)
      .order('transaction_date', { ascending: false });
    const withItems: LitterTransaction[] = [];
    for (const tx of txs ?? []) {
      const { data: items } = await client
        .from('litter_transaction_items')
        .select('*')
        .eq('transaction_id', tx.id)
        .order('sort_order');
      withItems.push({
        ...(tx as Omit<LitterTransaction, 'items'>),
        items: (items ?? []) as TransactionItem[],
      });
    }
    setTransactions(withItems);
    setLoading(false);
  }, [litterId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveTransaction = useCallback(
    async (
      payload: Omit<LitterTransaction, 'id' | 'items'> & { items: TransactionItem[] },
      attachmentUri?: string,
    ) => {
      const client = requireSupabase();
      let attachment_path = payload.attachment_path;
      if (attachmentUri) {
        const path = buildObjectPath(`litters/${litterId}/receipts`, 'pdf');
        const { error } = await uploadFile({
          bucket: 'documents',
          path,
          uri: attachmentUri,
          contentType: 'application/pdf',
        });
        if (!error) attachment_path = path;
      }
      const subtotal = payload.items.reduce((s, i) => s + i.amount_cents, 0);
      const tax = payload.items.reduce((s, i) => s + i.tax_cents, 0);
      const { data: tx, error: txErr } = await client
        .from('litter_transactions')
        .insert({
          litter_id: litterId,
          transaction_date: payload.transaction_date,
          transaction_type: payload.transaction_type,
          category: payload.category,
          currency: payload.currency,
          amounts_tax_mode: payload.amounts_tax_mode,
          invoice_number: payload.invoice_number,
          notes: payload.notes,
          attachment_path,
          subtotal_cents: subtotal,
          tax_cents: tax,
          total_cents: subtotal + tax,
        })
        .select()
        .single();
      if (txErr) throw new Error(txErr.message);
      const rows = payload.items.map((item, i) => ({
        transaction_id: tx.id,
        dog_id: item.dog_id ?? null,
        description: item.description,
        amount_cents: item.amount_cents,
        tax_cents: item.tax_cents,
        sort_order: i,
      }));
      const { error: itemErr } = await client.from('litter_transaction_items').insert(rows);
      if (itemErr) throw new Error(itemErr.message);
      await refresh();
    },
    [litterId, refresh],
  );

  const deleteTransaction = useCallback(
    async (id: string) => {
      const { error } = await requireSupabase().from('litter_transactions').delete().eq('id', id);
      if (error) throw new Error(error.message);
      await refresh();
    },
    [refresh],
  );

  return { transactions, loading, refresh, saveTransaction, deleteTransaction };
}
