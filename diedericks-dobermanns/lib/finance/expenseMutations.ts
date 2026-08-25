import { EXPENSE_WITH_CATEGORY } from '@/lib/finance/expenseColumns';
import { expenseGross } from '@/lib/finance/expenseGross';
import { requireSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { ExpenseWithCategory } from '@/types/finance';
import type { Json } from '@/types/database.types';

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

function expenseWritePayload(input: CreateExpenseInput) {
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
  };
}

async function writeExpenseAudit(input: {
  action: 'update' | 'delete';
  recordId: string;
  oldAmount: number;
  newAmount: number | null;
  oldValues: Json;
  newValues: Json | null;
  changedFields: string[];
}) {
  const supabase = requireSupabase();
  const profile = useAuthStore.getState().profile;
  const session = useAuthStore.getState().session;
  await supabase.from('audit_log').insert({
    table_name: 'expenses',
    record_id: input.recordId,
    action: input.action,
    actor_id: session?.user?.id ?? profile?.id ?? null,
    actor_email: session?.user?.email ?? null,
    actor_role: profile?.role ?? null,
    changed_fields: input.changedFields,
    old_values: input.oldValues,
    new_values: input.newValues,
  });
}

export async function createExpense(input: CreateExpenseInput) {
  const supabase = requireSupabase();
  const profileId = useAuthStore.getState().profile?.id ?? null;
  const { error } = await supabase.from('expenses').insert({
    ...expenseWritePayload(input),
    recorded_by: profileId ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function fetchExpenseById(id: string): Promise<ExpenseWithCategory | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('expenses')
    .select(`${EXPENSE_WITH_CATEGORY}, recorder:users!expenses_recorded_by_fkey(full_name)`)
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const row = data as Record<string, unknown>;
  const recorder = row.recorder as { full_name: string | null } | null;
  const mapped = mapExpenseRow(row);
  mapped.recordedByName = recorder?.full_name ?? null;
  return mapped;
}

export async function updateExpense(input: CreateExpenseInput & { id: string }) {
  const supabase = requireSupabase();
  const { id, ...rest } = input;
  const existing = await fetchExpenseById(id);
  const oldAmount = existing ? expenseGross(existing) : 0;
  const { error } = await supabase
    .from('expenses')
    .update({
      ...expenseWritePayload(rest),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw new Error(error.message);
  try {
    await writeExpenseAudit({
      action: 'update',
      recordId: id,
      oldAmount,
      newAmount: expenseGross({
        amount: rest.amount,
        vat_amount: rest.vat_amount,
      }),
      oldValues: {
        amount: existing?.amount ?? null,
        vat_amount: existing?.vat_amount ?? null,
        amount_gross: oldAmount,
      },
      newValues: {
        amount: rest.amount,
        vat_amount: rest.vat_amount,
        amount_gross: expenseGross({ amount: rest.amount, vat_amount: rest.vat_amount }),
      },
      changedFields: ['amount', 'vat_amount'],
    });
  } catch {
    /* trigger still records the row */
  }
}

export async function deleteExpense(
  id: string,
  opts?: { alsoFuture?: boolean },
) {
  const supabase = requireSupabase();
  const existing = await fetchExpenseById(id);
  if (!existing) throw new Error('Expense not found');

  if (opts?.alsoFuture && existing.is_recurring) {
    const { error: childErr } = await supabase
      .from('expenses')
      .delete()
      .eq('source', `recurring:${id}`);
    if (childErr) throw new Error(childErr.message);
  }

  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw new Error(error.message);
  try {
    await writeExpenseAudit({
      action: 'delete',
      recordId: id,
      oldAmount: expenseGross(existing),
      newAmount: null,
      oldValues: {
        amount: existing.amount,
        vat_amount: existing.vat_amount,
        amount_gross: expenseGross(existing),
        description: existing.description,
      },
      newValues: null,
      changedFields: ['amount'],
    });
  } catch {
    /* trigger still records the row */
  }
}

export { mapExpenseRow };
