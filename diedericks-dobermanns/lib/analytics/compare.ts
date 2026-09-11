/**
 * Period comparison and conversion math for the admin analytics screen.
 * Pure — no IO. Visitors are person-days (the hash already rotates at midnight).
 */

export const TRACKING_BEGAN = "2026-08-01";
export const DIRECT_SOURCE = "Direct or unknown";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;
const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export type DateRange = { from: string; to: string };

export type PeriodTotals = {
  from: string;
  to: string;
  visitors: number;
  views: number;
  applications: number;
  conversionPct: number | null;
};

export type ComparedPeriod = {
  label: string;
  caption: string;
  current: PeriodTotals;
  prior: PeriodTotals | null;
  visitorsChangePct: number | null;
  viewsChangePct: number | null;
  applicationsChangePct: number | null;
  conversionChangePct: number | null;
};

export type MonthConversionRow = {
  monthKey: string;
  label: string;
  visitors: number;
  applications: number;
  conversionPct: number | null;
  vsPriorPct: number | null;
  inProgress: boolean;
};

export type SourceRow = {
  host: string;
  visitors: number;
  applications: number;
  conversionPct: number | null;
};

export type SummaryLine = {
  visitors: number;
  applications: number;
  conversionPct: number | null;
  priorConversionPct: number | null;
  priorMonthName: string | null;
  direction: "up" | "down" | "same" | null;
};

export type AnalyticsPreset = "mtd" | "ytd" | "30d" | "custom";

export function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function conversionPct(applications: number, visitors: number): number | null {
  if (visitors <= 0) return null;
  return Math.round((applications / visitors) * 10000) / 100;
}

/** One decimal, matching the headline sentence (1.23 → 1.2%). */
export function formatConversionShort(pct: number | null): string {
  if (pct == null) return "—";
  return `${(Math.round(pct * 10) / 10).toFixed(1)}%`;
}

export function formatConversion(pct: number | null): string {
  if (pct == null) return "—";
  return `${pct.toFixed(2)}%`;
}

export function changePct(current: number, prior: number): number | null {
  if (prior === 0) return current === 0 ? 0 : null;
  return Math.round(((current - prior) / prior) * 1000) / 10;
}

export function formatChange(change: number | null): string {
  if (change == null) return "—";
  if (change === 0) return "no change";
  const abs = Math.abs(change);
  const n = Number.isInteger(abs) ? String(abs) : abs.toFixed(1);
  return change > 0 ? `up ${n}%` : `down ${n}%`;
}

/** The previous calendar month in full — used for the headline sentence rate. */
export function priorCalendarMonth(now = new Date()): DateRange {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0));
  return { from: toIsoDate(start), to: toIsoDate(end) };
}

export function daysInclusive(from: string, to: string): number {
  const a = Date.parse(`${from}T00:00:00.000Z`);
  const b = Date.parse(`${to}T00:00:00.000Z`);
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0;
  return Math.round((b - a) / 86_400_000) + 1;
}

export function monthToDateCaption(input: {
  current: DateRange;
  prior: DateRange;
  trackingStart: string;
}): { caption: string; priorComparable: boolean } {
  const days = daysInclusive(input.current.from, input.current.to);
  if (input.prior.to < input.trackingStart) {
    return {
      caption: `${formatInclusiveRange(input.current.from, input.current.to)} — no comparable window last month (tracking began ${formatDayMonthYear(input.trackingStart)})`,
      priorComparable: false,
    };
  }
  return {
    caption: `${formatInclusiveRange(input.current.from, input.current.to)} against the same ${days} days last month (${formatInclusiveRange(input.prior.from, input.prior.to)})`,
    priorComparable: true,
  };
}

export function monthToDateWindows(now = new Date()): { current: DateRange; prior: DateRange } {
  const to = toIsoDate(now);
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();
  const currentFrom = `${year}-${pad(month + 1)}-01`;

  const priorAnchor = new Date(Date.UTC(year, month - 1, 1));
  const priorYear = priorAnchor.getUTCFullYear();
  const priorMonth = priorAnchor.getUTCMonth();
  const lastDayPrior = new Date(Date.UTC(priorYear, priorMonth + 1, 0)).getUTCDate();
  const priorDay = Math.min(day, lastDayPrior);

  return {
    current: { from: currentFrom, to },
    prior: {
      from: `${priorYear}-${pad(priorMonth + 1)}-01`,
      to: `${priorYear}-${pad(priorMonth + 1)}-${pad(priorDay)}`,
    },
  };
}

/**
 * Real year-to-date only once tracking covers 1 January of this year.
 * Until then, do not present a partial year as a full one.
 */
export function yearToDateWindows(
  trackingStart: string,
  now = new Date(),
): {
  current: DateRange;
  prior: DateRange | null;
  label: string;
  caption: string;
  isFullYear: boolean;
} {
  const to = toIsoDate(now);
  const year = now.getUTCFullYear();
  const jan1 = `${year}-01-01`;
  if (trackingStart > jan1) {
    return {
      current: { from: maxDate(trackingStart, jan1), to },
      prior: null,
      label: "Since tracking began",
      caption: `since tracking began, ${formatDayMonthYear(trackingStart)}`,
      isFullYear: false,
    };
  }
  const md = to.slice(5);
  return {
    current: { from: jan1, to },
    prior: { from: `${year - 1}-01-01`, to: `${year - 1}-${md}` },
    label: "Year to date",
    caption: `1 January ${year} to ${formatDayMonthYear(to)}`,
    isFullYear: true,
  };
}

export function lastThirtyDays(now = new Date()): DateRange {
  const to = toIsoDate(now);
  const fromDate = new Date(now.getTime());
  fromDate.setUTCDate(fromDate.getUTCDate() - 29);
  return { from: toIsoDate(fromDate), to };
}

export function resolveSelectedRange(input: {
  period?: string | null;
  from?: string | null;
  to?: string | null;
  trackingStart: string;
  now?: Date;
}): { range: DateRange; preset: AnalyticsPreset; label: string } {
  const now = input.now ?? new Date();
  const customFrom = input.from && DATE_RE.test(input.from) ? input.from : null;
  const customTo = input.to && DATE_RE.test(input.to) ? input.to : null;
  if (customFrom && customTo) {
    const range =
      customFrom <= customTo
        ? { from: customFrom, to: customTo }
        : { from: customTo, to: customFrom };
    return { range, preset: "custom", label: formatInclusiveRange(range.from, range.to) };
  }

  const period = input.period;
  if (period === "ytd") {
    const ytd = yearToDateWindows(input.trackingStart, now);
    return { range: ytd.current, preset: "ytd", label: ytd.caption };
  }
  if (period === "30d") {
    const range = lastThirtyDays(now);
    return { range, preset: "30d", label: "Last 30 days" };
  }

  const mtd = monthToDateWindows(now);
  return {
    range: mtd.current,
    preset: "mtd",
    label: `Month to date, ${formatInclusiveRange(mtd.current.from, mtd.current.to)}`,
  };
}

export function totalsForRange(
  range: DateRange,
  daily: { viewed_on: string; views: number; visitors: number }[],
  applicationDates: string[],
): PeriodTotals {
  let views = 0;
  let visitors = 0;
  for (const row of daily) {
    if (row.viewed_on < range.from || row.viewed_on > range.to) continue;
    views += Number(row.views) || 0;
    visitors += Number(row.visitors) || 0;
  }
  let applications = 0;
  for (const iso of applicationDates) {
    const day = iso.slice(0, 10);
    if (day >= range.from && day <= range.to) applications += 1;
  }
  return {
    from: range.from,
    to: range.to,
    visitors,
    views,
    applications,
    conversionPct: conversionPct(applications, visitors),
  };
}

export function buildComparedPeriod(input: {
  label: string;
  caption: string;
  current: PeriodTotals;
  prior: PeriodTotals | null;
}): ComparedPeriod {
  return {
    label: input.label,
    caption: input.caption,
    current: input.current,
    prior: input.prior,
    visitorsChangePct: input.prior
      ? changePct(input.current.visitors, input.prior.visitors)
      : null,
    viewsChangePct: input.prior ? changePct(input.current.views, input.prior.views) : null,
    applicationsChangePct: input.prior
      ? changePct(input.current.applications, input.prior.applications)
      : null,
    conversionChangePct:
      input.prior &&
      input.current.conversionPct != null &&
      input.prior.conversionPct != null
        ? changePct(input.current.conversionPct, input.prior.conversionPct)
        : null,
  };
}

export function monthConversionRows(
  daily: { viewed_on: string; visitors: number }[],
  applicationDates: string[],
  now = new Date(),
): MonthConversionRow[] {
  const currentKey = toIsoDate(now).slice(0, 7);
  const buckets = new Map<string, { visitors: number; applications: number }>();

  for (const row of daily) {
    const key = row.viewed_on.slice(0, 7);
    const bucket = buckets.get(key) ?? { visitors: 0, applications: 0 };
    bucket.visitors += Number(row.visitors) || 0;
    buckets.set(key, bucket);
  }
  for (const iso of applicationDates) {
    const key = iso.slice(0, 7);
    const bucket = buckets.get(key) ?? { visitors: 0, applications: 0 };
    bucket.applications += 1;
    buckets.set(key, bucket);
  }

  const keys = [...buckets.keys()].sort((a, b) => (a < b ? 1 : -1));
  return keys.map((monthKey, index) => {
    const bucket = buckets.get(monthKey)!;
    const olderKey = keys[index + 1];
    const older = olderKey ? buckets.get(olderKey) : null;
    const conv = conversionPct(bucket.applications, bucket.visitors);
    const priorConv = older ? conversionPct(older.applications, older.visitors) : null;
    return {
      monthKey,
      label: monthLabel(monthKey),
      visitors: bucket.visitors,
      applications: bucket.applications,
      conversionPct: conv,
      vsPriorPct: conv != null && priorConv != null ? changePct(conv, priorConv) : null,
      inProgress: monthKey === currentKey,
    };
  });
}

export function summaryLine(
  thisMonth: PeriodTotals,
  priorFullMonth: PeriodTotals | null,
): SummaryLine {
  const direction =
    thisMonth.conversionPct == null || priorFullMonth?.conversionPct == null
      ? null
      : thisMonth.conversionPct < priorFullMonth.conversionPct
        ? "down"
        : thisMonth.conversionPct > priorFullMonth.conversionPct
          ? "up"
          : "same";
  return {
    visitors: thisMonth.visitors,
    applications: thisMonth.applications,
    conversionPct: thisMonth.conversionPct,
    priorConversionPct: priorFullMonth?.conversionPct ?? null,
    priorMonthName: priorFullMonth ? monthNameLong(priorFullMonth.from) : null,
    direction,
  };
}

export function sourceFromReferrer(host: string | null | undefined): string {
  const trimmed = host?.trim();
  return trimmed ? trimmed : DIRECT_SOURCE;
}

/** First non-empty referrer for each visitor_hash (already unique per day). */
export function firstTouchByVisitor(
  views: { visitor_hash: string; referrer_host: string | null; created_at: string }[],
): Map<string, string> {
  const ordered = [...views].sort((a, b) =>
    a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0,
  );
  const first: Map<string, string> = new Map();
  for (const row of ordered) {
    const existing = first.get(row.visitor_hash);
    const source = sourceFromReferrer(row.referrer_host);
    if (!existing) {
      first.set(row.visitor_hash, source);
      continue;
    }
    if (existing === DIRECT_SOURCE && source !== DIRECT_SOURCE) {
      first.set(row.visitor_hash, source);
    }
  }
  return first;
}

export function visitorsBySource(visitorToSource: Map<string, string>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const source of visitorToSource.values()) {
    counts.set(source, (counts.get(source) ?? 0) + 1);
  }
  return counts;
}

/**
 * Attribute each application to the visitor who viewed /apply closest before
 * (or up to two minutes after) the submit time. No visitor_hash on applications,
 * so this is the only join the stored columns allow.
 */
export function applicationsBySource(input: {
  applications: { created_at: string }[];
  applyViews: { visitor_hash: string; created_at: string }[];
  visitorToSource: Map<string, string>;
}): Map<string, number> {
  const counts = new Map<string, number>();
  const views = [...input.applyViews].sort((a, b) =>
    a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0,
  );
  const graceMs = 2 * 60 * 1000;

  for (const app of input.applications) {
    const appAt = Date.parse(app.created_at);
    let best: { visitor_hash: string; delta: number } | null = null;
    for (const view of views) {
      const viewAt = Date.parse(view.created_at);
      if (Number.isNaN(appAt) || Number.isNaN(viewAt)) continue;
      if (viewAt > appAt + graceMs) continue;
      const delta = Math.abs(appAt - viewAt);
      if (!best || delta < best.delta) {
        best = { visitor_hash: view.visitor_hash, delta };
      }
    }
    const source = best
      ? (input.visitorToSource.get(best.visitor_hash) ?? DIRECT_SOURCE)
      : DIRECT_SOURCE;
    counts.set(source, (counts.get(source) ?? 0) + 1);
  }
  return counts;
}

export function buildSourceRows(
  visitorToSource: Map<string, string>,
  appsBySource: Map<string, number>,
): SourceRow[] {
  const visitors = visitorsBySource(visitorToSource);
  const hosts = new Set([...visitors.keys(), ...appsBySource.keys()]);
  if (hosts.size === 0) return [];
  const rows: SourceRow[] = [];
  for (const host of hosts) {
    const v = visitors.get(host) ?? 0;
    const applications = appsBySource.get(host) ?? 0;
    rows.push({
      host,
      visitors: v,
      applications,
      conversionPct: conversionPct(applications, v),
    });
  }
  rows.sort((a, b) => {
    if (b.visitors !== a.visitors) return b.visitors - a.visitors;
    if (b.applications !== a.applications) return b.applications - a.applications;
    if (a.host === DIRECT_SOURCE) return 1;
    if (b.host === DIRECT_SOURCE) return -1;
    return a.host.localeCompare(b.host);
  });
  return rows;
}

export function formatInclusiveRange(from: string, to: string): string {
  if (from === to) return formatDayMonthYear(from);
  if (from.slice(0, 7) === to.slice(0, 7)) {
    return `${Number(from.slice(8))}–${Number(to.slice(8))} ${MONTHS_SHORT[Number(to.slice(5, 7)) - 1]} ${to.slice(0, 4)}`;
  }
  return `${formatDayMonthYear(from)} to ${formatDayMonthYear(to)}`;
}

export function formatDayMonthYear(iso: string): string {
  const day = Number(iso.slice(8, 10));
  const month = Number(iso.slice(5, 7));
  return `${day} ${MONTHS_SHORT[month - 1]} ${iso.slice(0, 4)}`;
}

export function monthNameLong(iso: string): string {
  const month = Number(iso.slice(5, 7));
  return MONTHS_LONG[month - 1] ?? iso;
}

function monthLabel(monthKey: string): string {
  const month = Number(monthKey.slice(5, 7));
  return `${MONTHS_LONG[month - 1]} ${monthKey.slice(0, 4)}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function maxDate(a: string, b: string): string {
  return a >= b ? a : b;
}
