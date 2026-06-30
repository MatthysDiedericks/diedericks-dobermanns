import { addMonths, addQuarters, addYears, format, parseISO } from 'date-fns';

import type { ExpenseWithCategory } from '@/types/finance';

export type RecurringInterval = 'monthly' | 'quarterly' | 'annual';

export function intervalLabel(interval: string | null): string {
  switch (interval) {
    case 'monthly':
      return 'Monthly';
    case 'quarterly':
      return 'Quarterly';
    case 'annual':
      return 'Annual';
    default:
      return 'Recurring';
  }
}

/** Converts recurring amount to a monthly equivalent for summary totals. */
export function monthlyEquivalent(amount: number, interval: string | null): number {
  switch (interval) {
    case 'quarterly':
      return amount / 3;
    case 'annual':
      return amount / 12;
    case 'monthly':
    default:
      return amount;
  }
}

export function nextDueDate(expenseDate: string, interval: string | null): Date {
  const base = parseISO(expenseDate);
  const now = new Date();
  let next = base;
  const advance =
    interval === 'quarterly'
      ? (d: Date) => addQuarters(d, 1)
      : interval === 'annual'
        ? (d: Date) => addYears(d, 1)
        : (d: Date) => addMonths(d, 1);

  while (next <= now) {
    next = advance(next);
  }
  return next;
}

export function formatNextDue(expenseDate: string, interval: string | null): string {
  return format(nextDueDate(expenseDate, interval), 'd MMM yyyy');
}

export function groupRecurringByInterval(expenses: ExpenseWithCategory[]) {
  const groups: Record<string, ExpenseWithCategory[]> = {
    monthly: [],
    quarterly: [],
    annual: [],
    other: [],
  };
  for (const exp of expenses) {
    const key = exp.recurrence_interval ?? 'other';
    if (key in groups) groups[key].push(exp);
    else groups.other.push(exp);
  }
  return groups;
}

export function recurringSummaryTotals(expenses: ExpenseWithCategory[]) {
  const monthly = expenses.reduce(
    (sum, e) => sum + monthlyEquivalent(Number(e.amount), e.recurrence_interval),
    0,
  );
  return { monthly, annual: monthly * 12 };
}
