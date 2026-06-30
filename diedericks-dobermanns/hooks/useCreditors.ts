import { useCallback, useEffect, useState } from 'react';

import { requireSupabase } from '@/lib/supabase';
import type { InvoiceListRow } from '@/types/finance';

export interface DebtorGroup {
  clientId: string;
  clientName: string;
  totalOutstanding: number;
  maxDaysOverdue: number;
  invoices: Array<
    InvoiceListRow & {
      daysOverdue: number;
      isOverdue: boolean;
    }
  >;
}

export interface CreditorRow {
  id: string;
  description: string;
  amount: number;
  expense_date: string;
  payable_due_date: string | null;
  creditor_name: string | null;
  supplier_name: string | null;
  categoryName: string;
  isOverdue: boolean;
}

function daysOverdue(dueDate: string | null): number {
  if (!dueDate) return 0;
  const due = new Date(dueDate);
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - due.getTime()) / 86_400_000);
}

export function useDebtors() {
  const [debtors, setDebtors] = useState<DebtorGroup[]>([]);
  const [totalOutstanding, setTotalOutstanding] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = requireSupabase();
      const { data, error: qErr } = await supabase
        .from('invoices')
        .select('*, client:users!invoices_client_id_fkey(full_name, email)')
        .gt('amount_outstanding', 0)
        .neq('status', 'void')
        .neq('status', 'cancelled')
        .order('due_date', { ascending: true, nullsFirst: false });

      if (qErr) throw new Error(qErr.message);

      const rows = (data ?? []) as unknown as InvoiceListRow[];
      const enriched = rows.map((inv) => {
        const overdue = daysOverdue(inv.due_date);
        return { ...inv, daysOverdue: overdue, isOverdue: overdue > 0 };
      });

      enriched.sort((a, b) => {
        if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
        if (a.isOverdue && b.isOverdue) return b.daysOverdue - a.daysOverdue;
        const aDue = a.due_date ?? '9999';
        const bDue = b.due_date ?? '9999';
        return aDue.localeCompare(bDue);
      });

      const groups = new Map<string, DebtorGroup>();
      for (const inv of enriched) {
        const clientId = inv.client_id ?? 'unknown';
        const clientName = inv.client?.full_name ?? 'Unknown client';
        const existing = groups.get(clientId);
        const outstanding = inv.amount_outstanding ?? 0;

        if (existing) {
          existing.totalOutstanding += outstanding;
          existing.maxDaysOverdue = Math.max(existing.maxDaysOverdue, inv.daysOverdue);
          existing.invoices.push(inv);
        } else {
          groups.set(clientId, {
            clientId,
            clientName,
            totalOutstanding: outstanding,
            maxDaysOverdue: inv.daysOverdue,
            invoices: [inv],
          });
        }
      }

      const grouped = [...groups.values()].sort((a, b) => b.maxDaysOverdue - a.maxDaysOverdue);
      const total = enriched.reduce((s, i) => s + (i.amount_outstanding ?? 0), 0);
      const overdue = enriched.filter((i) => i.isOverdue).length;

      setDebtors(grouped);
      setTotalOutstanding(total);
      setOverdueCount(overdue);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load debtors');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { debtors, totalOutstanding, overdueCount, loading, error, refresh };
}

export function useCreditors() {
  const [creditors, setCreditors] = useState<CreditorRow[]>([]);
  const [totalPayable, setTotalPayable] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = requireSupabase();
      const { data, error: qErr } = await supabase
        .from('expenses')
        .select('*, category:expense_categories(name)')
        .eq('is_payable', true)
        .is('payable_paid_date', null)
        .order('payable_due_date', { ascending: true, nullsFirst: false });

      if (qErr) throw new Error(qErr.message);

      const rows = (data ?? []).map((row) => {
        const r = row as Record<string, unknown>;
        const cat = r.category as { name: string } | null;
        const due = (r.payable_due_date as string | null) ?? null;
        const overdue = daysOverdue(due);
        return {
          id: r.id as string,
          description: r.description as string,
          amount: r.amount as number,
          expense_date: r.expense_date as string,
          payable_due_date: due,
          creditor_name: (r.creditor_name as string | null) ?? null,
          supplier_name: (r.supplier_name as string | null) ?? null,
          categoryName: cat?.name ?? 'Uncategorised',
          isOverdue: overdue > 0,
        };
      });

      setCreditors(rows);
      setTotalPayable(rows.reduce((s, r) => s + r.amount, 0));
      setOverdueCount(rows.filter((r) => r.isOverdue).length);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load creditors');
    } finally {
      setLoading(false);
    }
  }, []);

  const markPaid = useCallback(
    async (id: string) => {
      const supabase = requireSupabase();
      const today = new Date().toISOString().slice(0, 10);
      const { error: uErr } = await supabase
        .from('expenses')
        .update({ payable_paid_date: today })
        .eq('id', id);
      if (uErr) throw new Error(uErr.message);
      await refresh();
    },
    [refresh],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { creditors, totalPayable, overdueCount, loading, error, markPaid, refresh };
}
