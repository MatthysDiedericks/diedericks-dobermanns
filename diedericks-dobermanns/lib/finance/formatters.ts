import { format, parseISO } from 'date-fns';

export function formatAmount(value: number | null | undefined): string {
  const n = value ?? 0;
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 2,
  }).format(n);
}

export function formatAmountPlain(value: number): string {
  return value.toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return format(parseISO(value), 'd MMM yyyy');
  } catch {
    return '—';
  }
}

export function humanizeItemType(type: string): string {
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function humanizeStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function periodLabel(from: string, to: string): string {
  return `${formatDate(from)} – ${formatDate(to)}`;
}

export function deltaPct(current: number, prior: number): number | null {
  if (prior === 0) return current > 0 ? 100 : null;
  return ((current - prior) / prior) * 100;
}

export function formatDelta(pct: number | null): string {
  if (pct == null) return '—';
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}%`;
}
