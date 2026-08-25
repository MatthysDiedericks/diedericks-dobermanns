import { format, parseISO } from 'date-fns';

import { formatAmount } from '@/lib/finance/formatters';

/** Fields needed to show the money that actually left the bank. */
export type ExpenseMoney = {
  amount?: number | null;
  vat_amount?: number | null;
  amount_gross?: number | null;
};

/** Gross spend. Prefers the generated column; falls back to amount + VAT. */
export function expenseGross(e: ExpenseMoney): number {
  if (e.amount_gross != null && Number.isFinite(Number(e.amount_gross))) {
    return Number(e.amount_gross);
  }
  return Number(e.amount ?? 0) + Number(e.vat_amount ?? 0);
}

/** Quiet VAT sub-line — omitted when there is no VAT. */
export function expenseVatNote(vatAmount: number | null | undefined): string | null {
  const n = Number(vatAmount ?? 0);
  if (n <= 0) return null;
  return `includes ${formatAmount(n)} VAT`;
}

export function defaultVatAmount(netAmount: number, rate = 15): number {
  if (!Number.isFinite(netAmount) || netAmount <= 0) return 0;
  return Number(((netAmount * rate) / 100).toFixed(2));
}

/** True when typed VAT is more than 2c away from 15% of the amount. */
export function vatLooksOffRate(netAmount: number, vatAmount: number, rate = 15): boolean {
  if (vatAmount <= 0 || netAmount <= 0) return false;
  return Math.abs(vatAmount - defaultVatAmount(netAmount, rate)) > 0.02;
}

const MANUAL_SOURCES = new Set(['', 'manual', 'app', 'web']);

export function isImportedExpenseSource(source: string | null | undefined): boolean {
  if (!source) return false;
  const s = source.trim().toLowerCase();
  if (MANUAL_SOURCES.has(s)) return false;
  return s.includes('import') || s.includes('bank') || s.includes('reconcil');
}

export function expenseLoggedLabel(
  createdAt: string | null | undefined,
  recordedByName: string | null | undefined,
): string {
  let when = 'unknown date';
  if (createdAt) {
    try {
      when = format(parseISO(createdAt), 'd MMM');
    } catch {
      when = createdAt.slice(0, 10);
    }
  }
  const who = recordedByName?.trim() || 'unknown';
  return `logged ${when} by ${who}`;
}

export function deleteExpenseConfirmText(description: string, gross: number): string {
  return `Delete '${description}' for ${formatAmount(gross)}?`;
}
