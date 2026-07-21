import { requireSupabase } from '@/lib/supabase';
import type { BudgetLineItem, BudgetRow, UpsertBudgetInput, UpsertBudgetLineItemInput } from '@/types/finance';

export async function fetchBudgetsForYear(year: number): Promise<BudgetRow[]> {
  const sb = requireSupabase();
  const { data, error } = await sb.from('budgets').select('*').eq('year', year);
  if (error) throw new Error(error.message);
  return (data ?? []) as BudgetRow[];
}

export async function upsertBudgetRow(input: UpsertBudgetInput): Promise<void> {
  const sb = requireSupabase();
  let query = sb
    .from('budgets')
    .select('id')
    .eq('year', input.year)
    .eq('budget_type', input.budget_type);

  if (input.month == null) query = query.is('month', null);
  else query = query.eq('month', input.month);

  if (input.category_id == null) query = query.is('category_id', null);
  else query = query.eq('category_id', input.category_id);

  const { data: existing, error: findErr } = await query.maybeSingle();
  if (findErr) throw new Error(findErr.message);

  const payload = {
    year: input.year,
    month: input.month,
    category_id: input.category_id,
    label: input.label ?? null,
    budget_type: input.budget_type,
    budgeted_amount: input.budgeted_amount,
    notes: input.notes ?? null,
    updated_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { error } = await sb.from('budgets').update(payload).eq('id', existing.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await sb.from('budgets').insert(payload);
  if (error) throw new Error(error.message);
}

export async function deleteBudgetsForYear(year: number): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from('budgets').delete().eq('year', year);
  if (error) throw new Error(error.message);
}

/** Sum budgeted amounts for a type — annual rows (month null) plus monthly rows. */
export function sumBudgetAmount(
  budgets: BudgetRow[],
  budgetType: BudgetRow['budget_type'],
  categoryId?: string | null,
): number {
  const rows = budgets.filter((b) => {
    if (b.budget_type !== budgetType) return false;
    if (categoryId !== undefined) return b.category_id === categoryId;
    return true;
  });
  const annual = rows.filter((b) => b.month == null).reduce((s, b) => s + Number(b.budgeted_amount), 0);
  if (annual > 0) return annual;
  return rows.filter((b) => b.month != null).reduce((s, b) => s + Number(b.budgeted_amount), 0);
}

/**
 * Category totals from line items, keyed by month. `month === null` (annual view) sums
 * recurring items × 12 plus all one-off items (regardless of which month); a specific
 * month sums recurring items plus one-off items in that month only.
 */
export function lineItemsTotalForMonth(
  items: BudgetLineItem[],
  categoryId: string,
  month: number | null,
): number {
  const catItems = items.filter((i) => i.category_id === categoryId);
  const recurring = catItems.filter((i) => i.month == null);
  const oneOff = catItems.filter((i) => i.month != null);
  const recurringSum = recurring.reduce((s, i) => s + Number(i.amount), 0);
  if (month == null) {
    const oneOffSum = oneOff.reduce((s, i) => s + Number(i.amount), 0);
    return recurringSum * 12 + oneOffSum;
  }
  const oneOffSum = oneOff.filter((i) => i.month === month).reduce((s, i) => s + Number(i.amount), 0);
  return recurringSum + oneOffSum;
}

export function budgetForCategoryMonth(
  budgets: BudgetRow[],
  lineItems: BudgetLineItem[],
  categoryId: string,
  month: number | null,
): number {
  const hasLineItems = lineItems.some((i) => i.category_id === categoryId);
  if (hasLineItems) return lineItemsTotalForMonth(lineItems, categoryId, month);

  if (month == null) {
    const annual = budgets.find(
      (b) => b.category_id === categoryId && b.budget_type === 'expense' && b.month == null,
    );
    if (annual) return Number(annual.budgeted_amount);
    return budgets
      .filter((b) => b.category_id === categoryId && b.budget_type === 'expense' && b.month != null)
      .reduce((s, b) => s + Number(b.budgeted_amount), 0);
  }
  const monthly = budgets.find(
    (b) => b.category_id === categoryId && b.budget_type === 'expense' && b.month === month,
  );
  if (monthly) return Number(monthly.budgeted_amount);
  const annual = budgets.find(
    (b) => b.category_id === categoryId && b.budget_type === 'expense' && b.month == null,
  );
  return annual ? Number(annual.budgeted_amount) / 12 : 0;
}

export async function fetchBudgetLineItems(categoryId: string, year: number): Promise<BudgetLineItem[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('budget_line_items')
    .select('*')
    .eq('category_id', categoryId)
    .eq('year', year)
    .order('sort_order');
  if (error) throw new Error(error.message);
  return (data ?? []) as BudgetLineItem[];
}

export async function fetchAllBudgetLineItemsForYear(year: number): Promise<BudgetLineItem[]> {
  const sb = requireSupabase();
  const { data, error } = await sb
    .from('budget_line_items')
    .select('*')
    .eq('year', year)
    .order('sort_order');
  if (error) throw new Error(error.message);
  return (data ?? []) as BudgetLineItem[];
}

export async function upsertBudgetLineItem(input: UpsertBudgetLineItemInput): Promise<void> {
  const sb = requireSupabase();
  const payload = {
    category_id: input.category_id,
    year: input.year,
    month: input.month,
    name: input.name,
    amount: input.amount,
    sort_order: input.sort_order ?? 0,
    notes: input.notes ?? null,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { error } = await sb.from('budget_line_items').update(payload).eq('id', input.id);
    if (error) throw new Error(error.message);
    return;
  }

  const { error } = await sb.from('budget_line_items').insert(payload);
  if (error) throw new Error(error.message);
}

export async function deleteBudgetLineItem(id: string): Promise<void> {
  const sb = requireSupabase();
  const { error } = await sb.from('budget_line_items').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export function progressBarColor(pct: number): { bar: string; text: string } {
  if (pct >= 100) return { bar: 'bg-danger', text: 'text-danger' };
  if (pct >= 75) return { bar: 'bg-gold', text: 'text-gold' };
  return { bar: 'bg-success', text: 'text-success' };
}
