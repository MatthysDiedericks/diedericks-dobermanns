import { useCallback, useEffect, useState } from 'react';

import { EXPENSE_WITH_CATEGORY } from '@/lib/finance/expenseColumns';
import {
  fetchAllExpenses,
  fetchExpenseCategories,
} from '@/lib/finance/queries';
import { requireSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { ExpenseCategory, ExpenseWithCategory } from '@/types/finance';

export type AllocationType = 'general' | 'dog' | 'litter';

export interface CreateExpenseInput {
  category_id: string;
  description: string;
  price_excl_vat: number;
  vat_applicable: boolean;
  vat_rate: number;
  vat_amount: number;
  amount: number;
  expense_date: string;
  supplier_name?: string;
  invoice_reference?: string;
  allocation_type: AllocationType;
  dog_id?: string | null;
  litter_id?: string | null;
  payment_account_id?: string | null;
  payment_account_name?: string | null;
  receipt_url?: string | null;
  is_recurring?: boolean;
  recurrence_interval?: string | null;
  recurrence_end_date?: string | null;
  notes?: string;
  is_payable?: boolean;
  payable_due_date?: string | null;
  payable_paid_date?: string | null;
  creditor_name?: string | null;
}

function mapExpenseRow(r: Record<string, unknown>): ExpenseWithCategory {
  const cat = r.category as { name: string; colour: string } | null;
  return {
    ...(r as unknown as ExpenseWithCategory),
    categoryName: cat?.name ?? 'Other',
    categoryColour: cat?.colour ?? '#888888',
  };
}

function expenseInsertPayload(input: CreateExpenseInput, profileId: string | null) {
  return {
    category_id: input.category_id,
    description: input.description,
    price_excl_vat: input.price_excl_vat,
    vat_applicable: input.vat_applicable,
    vat_rate: input.vat_rate,
    vat_amount: input.vat_amount,
    amount: input.amount,
    expense_date: input.expense_date,
    supplier_name: input.supplier_name ?? null,
    invoice_reference: input.invoice_reference ?? null,
    allocation_type: input.allocation_type,
    dog_id: input.dog_id ?? null,
    litter_id: input.litter_id ?? null,
    payment_account_id: input.payment_account_id ?? null,
    payment_account_name: input.payment_account_name ?? null,
    receipt_url: input.receipt_url ?? null,
    is_recurring: input.is_recurring ?? false,
    recurrence_interval: input.recurrence_interval ?? null,
    recurrence_end_date: input.recurrence_end_date ?? null,
    notes: input.notes ?? null,
    is_payable: input.is_payable ?? false,
    payable_due_date: input.payable_due_date ?? null,
    payable_paid_date: input.payable_paid_date ?? null,
    creditor_name: input.creditor_name ?? null,
    recorded_by: profileId ?? null,
  };
}

export function useExpenses(categoryId?: string) {
  const [data, setData] = useState<ExpenseWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await fetchAllExpenses(categoryId);
      setData(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

export function useExpenseCategories() {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExpenseCategories()
      .then(setCategories)
      .finally(() => setLoading(false));
  }, []);

  return { categories, loading };
}

export async function createExpense(input: CreateExpenseInput) {
  const supabase = requireSupabase();
  const profileId = useAuthStore.getState().profile?.id ?? null;
  const { error } = await supabase.from('expenses').insert(expenseInsertPayload(input, profileId));
  if (error) throw new Error(error.message);
}

export async function deleteExpense(id: string) {
  const supabase = requireSupabase();
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function fetchExpenseById(id: string): Promise<ExpenseWithCategory | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('expenses')
    .select(EXPENSE_WITH_CATEGORY)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapExpenseRow(data as Record<string, unknown>);
}

interface UpdateExpenseInput extends CreateExpenseInput {
  id: string;
}

export async function updateExpense(input: UpdateExpenseInput) {
  const supabase = requireSupabase();
  const { id, ...rest } = input;
  const profileId = useAuthStore.getState().profile?.id ?? null;
  const { error } = await supabase
    .from('expenses')
    .update({
      ...expenseInsertPayload(rest, profileId),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export function useExpensesByDog(dogId: string | undefined) {
  const [data, setData] = useState<ExpenseWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);

  const refresh = useCallback(async () => {
    if (!dogId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const supabase = requireSupabase();
      const { data: rows, error } = await supabase
        .from('expenses')
        .select(EXPENSE_WITH_CATEGORY)
        .eq('dog_id', dogId)
        .order('expense_date', { ascending: false });
      if (error) throw new Error(error.message);
      const mapped = (rows ?? []).map((r) => mapExpenseRow(r as Record<string, unknown>));
      setData(mapped);
      setTotalAmount(mapped.reduce((sum, r) => sum + r.amount, 0));
    } catch (e) {
      console.error('[useExpensesByDog]', e);
    } finally {
      setLoading(false);
    }
  }, [dogId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, totalAmount, loading, refresh };
}

export function useExpensesByLitter(litterId: string | undefined) {
  const [data, setData] = useState<ExpenseWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);

  const refresh = useCallback(async () => {
    if (!litterId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const supabase = requireSupabase();
      const { data: rows, error } = await supabase
        .from('expenses')
        .select(EXPENSE_WITH_CATEGORY)
        .eq('litter_id', litterId)
        .order('expense_date', { ascending: false });
      if (error) throw new Error(error.message);
      const mapped = (rows ?? []).map((r) => mapExpenseRow(r as Record<string, unknown>));
      setData(mapped);
      setTotalAmount(mapped.reduce((sum, r) => sum + r.amount, 0));
    } catch (e) {
      console.error('[useExpensesByLitter]', e);
    } finally {
      setLoading(false);
    }
  }, [litterId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, totalAmount, loading, refresh };
}

export function usePaymentAccounts() {
  const [accounts, setAccounts] = useState<{ id: string; name: string; account_type: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = requireSupabase();
    void supabase
      .from('payment_accounts')
      .select('id, name, account_type')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data, error }) => {
        if (!error) setAccounts(data ?? []);
        setLoading(false);
      });
  }, []);

  return { accounts, loading };
}

export function useVatExpenseSummary(from: string, to: string) {
  const [totalVat, setTotalVat] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = requireSupabase();
    void supabase
      .from('expenses')
      .select('vat_amount')
      .eq('vat_applicable', true)
      .gte('expense_date', from)
      .lte('expense_date', to)
      .then(({ data }) => {
        setTotalVat((data ?? []).reduce((s, r) => s + (Number(r.vat_amount) || 0), 0));
        setLoading(false);
      });
  }, [from, to]);

  return { totalVat, loading };
}

export function useExpenseAllocationBreakdown(from: string, to: string) {
  const [breakdown, setBreakdown] = useState({ general: 0, dog: 0, litter: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = requireSupabase();
    void supabase
      .from('expenses')
      .select('allocation_type, amount')
      .gte('expense_date', from)
      .lte('expense_date', to)
      .then(({ data }) => {
        const rows = data ?? [];
        const general = rows
          .filter((r) => r.allocation_type === 'general')
          .reduce((s, r) => s + Number(r.amount), 0);
        const dog = rows
          .filter((r) => r.allocation_type === 'dog')
          .reduce((s, r) => s + Number(r.amount), 0);
        const litter = rows
          .filter((r) => r.allocation_type === 'litter')
          .reduce((s, r) => s + Number(r.amount), 0);
        setBreakdown({ general, dog, litter, total: general + dog + litter });
        setLoading(false);
      });
  }, [from, to]);

  return { breakdown, loading };
}
