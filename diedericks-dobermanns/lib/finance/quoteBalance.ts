import { formatAmount } from '@/lib/finance/formatters';

export type QuoteInvoiceBalance = {
  amount_outstanding: number;
  amount_paid: number;
  total_amount: number;
};

/** One linked invoice, or none. Supabase may return an object or a one-row array. */
export function readQuoteInvoice(raw: unknown): QuoteInvoiceBalance | null {
  if (!raw) return null;
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  if (r.amount_outstanding == null && r.amount_paid == null && r.total_amount == null) {
    return null;
  }
  return {
    amount_outstanding: Number(r.amount_outstanding ?? 0),
    amount_paid: Number(r.amount_paid ?? 0),
    total_amount: Number(r.total_amount ?? 0),
  };
}

export type QuoteBalanceFields = {
  total: number;
  invoiceOutstanding?: number | null;
  invoicePaid?: number | null;
};

export function invoiceFieldsFromJoin(raw: unknown): {
  invoiceOutstanding: number | null;
  invoicePaid: number | null;
} {
  const inv = readQuoteInvoice(raw);
  if (!inv) return { invoiceOutstanding: null, invoicePaid: null };
  return { invoiceOutstanding: inv.amount_outstanding, invoicePaid: inv.amount_paid };
}

/** No-invoice rows sort last in both directions — they are N/A, not zero. */
export function compareBalanceDue(a: number | null, b: number | null): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return b - a;
}

export function quoteListMoneyTotals(rows: QuoteBalanceFields[]): {
  owingCount: number;
  total: number;
  paid: number;
  balance: number;
} {
  let owingCount = 0;
  let total = 0;
  let paid = 0;
  let balance = 0;
  for (const r of rows) {
    total += Number(r.total) || 0;
    if (r.invoiceOutstanding == null) continue;
    paid += Number(r.invoicePaid) || 0;
    balance += r.invoiceOutstanding;
    if (r.invoiceOutstanding > 0) owingCount += 1;
  }
  return { owingCount, total, paid, balance };
}

export function outstandingSummaryLine(owingCount: number, balance: number): string | null {
  if (balance <= 0 || owingCount === 0) return null;
  const quotes = owingCount === 1 ? 'quote' : 'quotes';
  return `${formatAmount(balance)} outstanding across ${owingCount} ${quotes}`;
}

export function owingFooterLabel(owingCount: number): string {
  return `${owingCount} ${owingCount === 1 ? 'quote' : 'quotes'} owing`;
}
