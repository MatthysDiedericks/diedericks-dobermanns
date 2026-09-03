import { addMonths, addQuarters, addYears, format, parseISO } from 'date-fns';

export type RecurringInvoiceInterval = 'monthly' | 'quarterly' | 'annual';

export const RECURRING_INTERVALS: RecurringInvoiceInterval[] = [
  'monthly',
  'quarterly',
  'annual',
];

export function isRecurringInterval(value: string): value is RecurringInvoiceInterval {
  return RECURRING_INTERVALS.includes(value as RecurringInvoiceInterval);
}

export function advanceIssueDate(from: string, interval: string): string {
  const base = parseISO(from);
  const next =
    interval === 'quarterly'
      ? addQuarters(base, 1)
      : interval === 'annual'
        ? addYears(base, 1)
        : addMonths(base, 1);
  return format(next, 'yyyy-MM-dd');
}

export function nextIssueDates(
  start: string,
  interval: string,
  count: number,
  endDate?: string | null,
  remaining?: number | null,
): string[] {
  const dates: string[] = [];
  let current = start;
  const cap = remaining != null ? Math.min(count, Math.max(remaining, 0)) : count;
  for (let i = 0; i < cap; i++) {
    if (endDate && current > endDate) break;
    dates.push(current);
    current = advanceIssueDate(current, interval);
  }
  return dates;
}

function plainDate(iso: string): string {
  return format(parseISO(iso), 'd MMM');
}

/** "Issues 1 Oct, 1 Nov, 1 Dec, then stops" */
export function previewIssueCopy(
  start: string,
  interval: string,
  endDate?: string | null,
  remaining?: number | null,
): string {
  const dates = nextIssueDates(start, interval, 3, endDate, remaining);
  if (dates.length === 0) return 'No further issue dates.';
  const listed = dates.map(plainDate).join(', ');
  const last = dates[dates.length - 1]!;
  const next = advanceIssueDate(last, interval);
  const hitsEnd = Boolean(endDate && next > endDate);
  const hitsCount = remaining != null && remaining <= dates.length;
  if (remaining === 1) return `Issues ${plainDate(dates[0]!)}, then stops`;
  return hitsEnd || hitsCount
    ? `Issues ${listed}, then stops`
    : `Issues ${listed}, then continues`;
}

export function intervalPlain(interval: string): string {
  if (interval === 'quarterly') return 'quarterly';
  if (interval === 'annual') return 'annually';
  return 'monthly';
}
