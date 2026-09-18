import { requireSupabase } from '@/lib/supabase';
import {
  reconcileExpenseAllocations,
  type AllocationReconciliation,
  type ReconcileLine,
} from '@/lib/finance/reconcileAllocations';
import { isAllocationKind, toCents } from '@/lib/finance/resolveAllocations';

const PAGE = 1000;

type LineRow = {
  id: string;
  expense_id: string;
  line_amount: number | string;
  allocation_kind: string;
  description: string;
};

type ExpenseRow = {
  id: string;
  expense_date: string;
  supplier_name: string | null;
  invoice_reference: string | null;
  description: string;
  amount: number | string;
};

type AllocRow = {
  expense_line_id: string;
  amount: number | string;
};

async function fetchPages<T>(table: 'expense_lines' | 'expenses' | 'expense_allocations', columns: string) {
  const supabase = requireSupabase();
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const batch = (data ?? []) as T[];
    rows.push(...batch);
    if (batch.length < PAGE) break;
  }
  return rows;
}

function inRange(date: string, from?: string, to?: string) {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

export async function fetchAllocationReconciliation(
  from?: string,
  to?: string,
): Promise<AllocationReconciliation> {
  const [expenses, lines, allocations] = await Promise.all([
    fetchPages<ExpenseRow>(
      'expenses',
      'id, expense_date, supplier_name, invoice_reference, description, amount',
    ),
    fetchPages<LineRow>(
      'expense_lines',
      'id, expense_id, line_amount, allocation_kind, description',
    ),
    fetchPages<AllocRow>('expense_allocations', 'expense_line_id, amount'),
  ]);

  const expenseById = new Map(expenses.map((e) => [e.id, e]));
  const reconcileLines: ReconcileLine[] = [];
  let headerTotal = 0;
  const seenHeaders = new Set<string>();

  for (const row of lines) {
    const expense = expenseById.get(row.expense_id);
    if (!expense) continue;
    const date = expense.expense_date.slice(0, 10);
    if (!inRange(date, from, to)) continue;
    const kind = isAllocationKind(row.allocation_kind)
      ? row.allocation_kind
      : 'shared';
    reconcileLines.push({
      id: row.id,
      expenseId: row.expense_id,
      expenseDate: date,
      description: row.description || expense.description,
      supplierName: expense.supplier_name,
      invoiceReference: expense.invoice_reference,
      kind,
      lineAmount: Number(row.line_amount),
    });
    if (!seenHeaders.has(expense.id)) {
      seenHeaders.add(expense.id);
      headerTotal += Number(expense.amount);
    }
  }

  const allocatedCents = new Map<string, number>();
  const lineIds = new Set(reconcileLines.map((l) => l.id));
  for (const row of allocations) {
    if (!lineIds.has(row.expense_line_id)) continue;
    allocatedCents.set(
      row.expense_line_id,
      (allocatedCents.get(row.expense_line_id) ?? 0) + toCents(Number(row.amount)),
    );
  }

  return reconcileExpenseAllocations({
    lines: reconcileLines,
    allocatedCentsByLineId: allocatedCents,
    headerTotal,
  });
}
