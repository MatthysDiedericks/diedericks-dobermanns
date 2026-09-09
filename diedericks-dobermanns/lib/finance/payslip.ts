import { endOfMonth, format, parseISO, startOfMonth } from 'date-fns';

import type { PayslipDeduction } from '@/types/employees';

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Net actually paid: gross minus employee deductions. Employer ENPF is not subtracted. */
export function payslipNet(gross: number, deductions: PayslipDeduction[]): number {
  const taken = deductions.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
  return roundMoney((Number(gross) || 0) - taken);
}

/** Employee or employer ENPF: min(gross, ceiling) × rate. Never hardcode the ceiling. */
export function suggestEnpfContribution(
  gross: number,
  wageCeiling: number,
  rate: number,
): number {
  const cap = Number(wageCeiling) || 0;
  const fraction = Number(rate) || 0;
  return roundMoney(Math.min(Number(gross) || 0, cap) * fraction);
}

export function periodFromDate(isoDate: string): { start: string; end: string } {
  const day = parseISO(isoDate);
  return {
    start: format(startOfMonth(day), 'yyyy-MM-dd'),
    end: format(endOfMonth(day), 'yyyy-MM-dd'),
  };
}

export function deductionsForSave(rows: PayslipDeduction[]): PayslipDeduction[] {
  return rows
    .map((row) => ({
      label: row.label.trim(),
      amount: roundMoney(Number(row.amount) || 0),
    }))
    .filter((row) => row.label.length > 0 && row.amount > 0);
}

export function emptyPayeLine(): PayslipDeduction {
  return { label: 'PAYE', amount: 0 };
}

export function suggestedEnpfLine(amount: number): PayslipDeduction {
  return { label: 'ENPF', amount: roundMoney(amount) };
}

export function formatPayslipAmount(amount: number, currency: string): string {
  const n = (Number(amount) || 0).toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (currency === 'SZL') return `E ${n}`;
  return `${currency} ${n}`;
}

export function payslipCurrencyLabel(currency: string): string {
  if (currency === 'SZL') return 'E / SZL';
  return currency;
}

export function yearFromIso(isoDate: string): number {
  const parsed = Number(isoDate.slice(0, 4));
  return Number.isFinite(parsed) ? parsed : new Date().getFullYear();
}
