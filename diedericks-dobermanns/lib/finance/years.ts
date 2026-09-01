/** Finance year selector: 2022 through current year + 2. */
export function financeYearRange(): number[] {
  const endYear = new Date().getFullYear() + 2;
  return Array.from({ length: endYear - 2022 + 1 }, (_, i) => 2022 + i);
}

export type FinanceYearSelection = number | 'all';

/**
 * Contiguous descending years from the earliest record through at least the
 * current calendar year. Quiet years stay in the row; future years are not
 * invented. Cashflow keeps financeYearRange() because it forecasts forward.
 */
export function yearsFromRecordBounds(
  dates: ReadonlyArray<string | null | undefined>,
  currentYear: number = new Date().getFullYear(),
): number[] {
  const parsed: number[] = [];
  for (const value of dates) {
    if (!value) continue;
    const year = Number.parseInt(value.slice(0, 4), 10);
    if (Number.isFinite(year) && year >= 1900) parsed.push(year);
  }
  const earliest = parsed.length > 0 ? Math.min(...parsed) : currentYear;
  const latest = parsed.length > 0 ? Math.max(...parsed) : currentYear;
  const end = Math.max(latest, currentYear);
  const start = Math.min(earliest, end);
  const years: number[] = [];
  for (let y = end; y >= start; y -= 1) years.push(y);
  return years;
}

/** Inclusive calendar span for the All-years ledger view. */
export function financeLedgerDateSpan(years: number[]): { from: string; to: string } {
  const current = new Date().getFullYear();
  const newest = years[0] ?? current;
  const oldest = years[years.length - 1] ?? newest;
  return { from: `${oldest}-01-01`, to: `${newest}-12-31` };
}

let inflight: Promise<number[]> | null = null;

/**
 * Years that actually contain financial records, newest first.
 * Derived, never hardcoded: the kennel's history starts in 2021 and a hardcoded
 * floor silently hid 54 invoices. Cashflow keeps financeYearRange() because it
 * forecasts forward; a ledger only shows years that happened.
 */
export async function financeYearsWithData(): Promise<number[]> {
  inflight ??= loadFinanceYearsWithData().catch((err: unknown) => {
    inflight = null;
    throw err;
  });
  return inflight;
}

async function loadFinanceYearsWithData(): Promise<number[]> {
  const { requireSupabase } = await import('@/lib/supabase');
  const supabase = requireSupabase();
  const [invAsc, invDesc, expAsc, expDesc] = await Promise.all([
    supabase.from('invoices').select('issue_date').order('issue_date', { ascending: true }).limit(1),
    supabase.from('invoices').select('issue_date').order('issue_date', { ascending: false }).limit(1),
    supabase.from('expenses').select('expense_date').order('expense_date', { ascending: true }).limit(1),
    supabase.from('expenses').select('expense_date').order('expense_date', { ascending: false }).limit(1),
  ]);
  const firstError =
    invAsc.error ?? invDesc.error ?? expAsc.error ?? expDesc.error;
  if (firstError) throw new Error(firstError.message);
  return yearsFromRecordBounds([
    invAsc.data?.[0]?.issue_date,
    invDesc.data?.[0]?.issue_date,
    expAsc.data?.[0]?.expense_date,
    expDesc.data?.[0]?.expense_date,
  ]);
}
