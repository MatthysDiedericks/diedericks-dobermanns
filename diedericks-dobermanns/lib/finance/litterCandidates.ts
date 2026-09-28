/**
 * Candidate litters for a payment. The window is whelp date 8 to 16 weeks
 * before the payment. Buyer name is not an input.
 */

export const GO_HOME_MIN_DAYS = 8 * 7;
export const GO_HOME_MAX_DAYS = 16 * 7;
const WINDOW_CENTRE_DAYS = 12 * 7;

export type SaleLitter = {
  id: string;
  name: string;
  whelpDate: string | null;
  damName: string;
  sireName: string;
  sold: number;
  linked: boolean;
};

export type LitterPuppyOption = {
  id: string;
  litterId: string;
  name: string;
  status: string;
};

function day(value: string | null | undefined): string | null {
  if (!value) return null;
  const sliced = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(sliced) ? sliced : null;
}

/** Days from whelp to payment. Negative when the litter was whelped afterwards. */
export function daysFromWhelpToPayment(
  whelp: string | null | undefined,
  payment: string | null | undefined,
): number | null {
  const born = day(whelp);
  const paid = day(payment);
  if (!born || !paid) return null;
  const left = Date.parse(`${born}T00:00:00Z`);
  const right = Date.parse(`${paid}T00:00:00Z`);
  if (Number.isNaN(left) || Number.isNaN(right)) return null;
  return Math.round((right - left) / 86400000);
}

export function litterInGoHomeWindow(
  whelp: string | null | undefined,
  payment: string | null | undefined,
): boolean {
  const days = daysFromWhelpToPayment(whelp, payment);
  if (days == null) return false;
  return days >= GO_HOME_MIN_DAYS && days <= GO_HOME_MAX_DAYS;
}

export function shortlistSaleLitters(
  payment: string | null | undefined,
  litters: SaleLitter[],
): { inWindow: SaleLitter[]; outside: SaleLitter[] } {
  const inWindow: { litter: SaleLitter; days: number }[] = [];
  const outside: { litter: SaleLitter; days: number }[] = [];
  for (const litter of litters) {
    const days = daysFromWhelpToPayment(litter.whelpDate, payment);
    if (days == null || days < 0) continue;
    if (days >= GO_HOME_MIN_DAYS && days <= GO_HOME_MAX_DAYS) inWindow.push({ litter, days });
    else outside.push({ litter, days });
  }
  inWindow.sort((a, b) => {
    const byCentre = Math.abs(a.days - WINDOW_CENTRE_DAYS) - Math.abs(b.days - WINDOW_CENTRE_DAYS);
    if (byCentre !== 0) return byCentre;
    return a.litter.name.localeCompare(b.litter.name);
  });
  outside.sort((a, b) => {
    const edge = (days: number) =>
      days < GO_HOME_MIN_DAYS ? GO_HOME_MIN_DAYS - days : days - GO_HOME_MAX_DAYS;
    const byEdge = edge(a.days) - edge(b.days);
    if (byEdge !== 0) return byEdge;
    return a.litter.name.localeCompare(b.litter.name);
  });
  return {
    inWindow: inWindow.map((row) => row.litter),
    outside: outside.slice(0, 6).map((row) => row.litter),
  };
}

/** Litters that produced at least one sold puppy. Empty test litters stay out. */
export function litterIncomeProgress(litters: Pick<SaleLitter, "sold" | "linked">[]): {
  linked: number;
  total: number;
} {
  const produced = litters.filter((litter) => litter.sold > 0);
  return {
    total: produced.length,
    linked: produced.filter((litter) => litter.linked).length,
  };
}

export function litterProgressLabel(linked: number, total: number): string {
  return `${linked} of ${total} litters have income linked`;
}
