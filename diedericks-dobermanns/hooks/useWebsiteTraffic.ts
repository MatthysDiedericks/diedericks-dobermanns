import { useCallback, useEffect, useState } from 'react';

import {
  TRACKING_BEGAN,
  applicationsBySource,
  buildComparedPeriod,
  buildSourceRows,
  firstTouchByVisitor,
  lastThirtyDays,
  monthConversionRows,
  monthToDateCaption,
  monthToDateWindows,
  priorCalendarMonth,
  resolveSelectedRange,
  summaryLine,
  totalsForRange,
  yearToDateWindows,
  type AnalyticsPreset,
  type ComparedPeriod,
  type MonthConversionRow,
  type SourceRow,
  type SummaryLine,
} from '@/lib/analytics/compare';
import { requireSupabase } from '@/lib/supabase';

export type DailyTraffic = {
  viewed_on: string;
  views: number;
  visitors: number;
};

export type PathCount = { path: string; views: number };
export type CountryCount = { country: string; views: number };

export type WebsiteTrafficStats = {
  hasAnyData: boolean;
  trackingStart: string;
  summary: SummaryLine;
  monthToDate: ComparedPeriod;
  yearToDate: ComparedPeriod;
  months: MonthConversionRow[];
  selected: { from: string; to: string; preset: AnalyticsPreset; label: string };
  sources: SourceRow[];
  dailyChart: DailyTraffic[];
  topPages: [string, number][];
  topCountries: [string, number][];
  botSharePct: number | null;
  viewsHumansSelected: number;
  viewsIncludingBotsSelected: number;
};

type ViewRow = {
  visitor_hash: string;
  referrer_host: string | null;
  path: string;
  created_at: string;
  country: string | null;
};

function emptyCompared(label: string, caption: string): ComparedPeriod {
  const zero = {
    from: '',
    to: '',
    visitors: 0,
    views: 0,
    applications: 0,
    conversionPct: null,
  };
  return buildComparedPeriod({ label, caption, current: zero, prior: null });
}

const empty: WebsiteTrafficStats = {
  hasAnyData: false,
  trackingStart: TRACKING_BEGAN,
  summary: {
    visitors: 0,
    applications: 0,
    conversionPct: null,
    priorConversionPct: null,
    priorMonthName: null,
    direction: null,
  },
  monthToDate: emptyCompared('Month to date', ''),
  yearToDate: emptyCompared('Since tracking began', 'since tracking began, 1 Aug 2026'),
  months: [],
  selected: { from: '', to: '', preset: 'mtd', label: 'Month to date' },
  sources: [],
  dailyChart: [],
  topPages: [],
  topCountries: [],
  botSharePct: null,
  viewsHumansSelected: 0,
  viewsIncludingBotsSelected: 0,
};

/**
 * Read-only website traffic for the admin analytics screen.
 * Does NOT call record_page_view — the Expo app must never pollute website counts.
 */
export function useWebsiteTraffic(input?: {
  period?: string | null;
  from?: string | null;
  to?: string | null;
}) {
  const [data, setData] = useState<WebsiteTrafficStats>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const period = input?.period ?? null;
  const from = input?.from ?? null;
  const to = input?.to ?? null;

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const client = requireSupabase();
      const [{ data: dailyRows, error: dailyErr }, { count: anyCount }, { data: appRows }] =
        await Promise.all([
          client
            .from('page_view_daily')
            .select('viewed_on, views, visitors')
            .gte('viewed_on', TRACKING_BEGAN)
            .order('viewed_on', { ascending: true }),
          client.from('page_views').select('id', { count: 'exact', head: true }).limit(1),
          client
            .from('applications')
            .select('created_at')
            .gte('created_at', `${TRACKING_BEGAN}T00:00:00.000Z`)
            .limit(5000),
        ]);
      if (dailyErr) throw dailyErr;

      const daily = ((dailyRows ?? []) as DailyTraffic[]).map((r) => ({
        viewed_on: r.viewed_on,
        views: Number(r.views) || 0,
        visitors: Number(r.visitors) || 0,
      }));
      const applicationDates = ((appRows ?? []) as { created_at: string }[]).map((r) => r.created_at);
      const trackingStart = daily[0]?.viewed_on ?? TRACKING_BEGAN;

      const mtdWindows = monthToDateWindows();
      const ytdWindows = yearToDateWindows(trackingStart);
      const priorMonth = priorCalendarMonth();
      const mtdMeta = monthToDateCaption({
        current: mtdWindows.current,
        prior: mtdWindows.prior,
        trackingStart,
      });
      const monthToDate = buildComparedPeriod({
        label: 'Month to date',
        caption: mtdMeta.caption,
        current: totalsForRange(mtdWindows.current, daily, applicationDates),
        prior: mtdMeta.priorComparable
          ? totalsForRange(mtdWindows.prior, daily, applicationDates)
          : null,
      });
      const yearToDate = buildComparedPeriod({
        label: ytdWindows.label,
        caption: ytdWindows.caption,
        current: totalsForRange(ytdWindows.current, daily, applicationDates),
        prior: ytdWindows.prior
          ? totalsForRange(ytdWindows.prior, daily, applicationDates)
          : null,
      });
      const selected = resolveSelectedRange({ period, from, to, trackingStart });

      const views = await fetchAllViews(client, selected.range.from, selected.range.to);
      const [{ count: totalSelected }, { count: botSelected }] = await Promise.all([
        client
          .from('page_views')
          .select('id', { count: 'exact', head: true })
          .gte('viewed_on', selected.range.from)
          .lte('viewed_on', selected.range.to),
        client
          .from('page_views')
          .select('id', { count: 'exact', head: true })
          .eq('is_bot', true)
          .gte('viewed_on', selected.range.from)
          .lte('viewed_on', selected.range.to),
      ]);

      const visitorToSource = firstTouchByVisitor(views);
      const applyViews = views.filter((v) => v.path === '/apply');
      const appsInRange = ((appRows ?? []) as { created_at: string }[]).filter((r) => {
        const day = r.created_at.slice(0, 10);
        return day >= selected.range.from && day <= selected.range.to;
      });
      const sources = buildSourceRows(
        visitorToSource,
        applicationsBySource({
          applications: appsInRange,
          applyViews,
          visitorToSource,
        }),
      );

      const chartStart = lastThirtyDays().from;
      const total = totalSelected ?? 0;
      const bots = botSelected ?? 0;

      setData({
        hasAnyData: (anyCount ?? 0) > 0 || daily.length > 0,
        trackingStart,
        summary: summaryLine(monthToDate.current, totalsForRange(priorMonth, daily, applicationDates)),
        monthToDate,
        yearToDate,
        months: monthConversionRows(daily, applicationDates),
        selected: {
          from: selected.range.from,
          to: selected.range.to,
          preset: selected.preset,
          label: selected.label,
        },
        sources,
        dailyChart: daily.filter((r) => r.viewed_on >= chartStart),
        topPages: countField(views, 'path').slice(0, 5),
        topCountries: countField(
          views.filter((v) => v.country),
          'country',
        ).slice(0, 5),
        botSharePct: total > 0 ? Math.round((bots / total) * 1000) / 10 : null,
        viewsHumansSelected: Math.max(0, total - bots),
        viewsIncludingBotsSelected: total,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load website traffic');
      setData(empty);
    } finally {
      setLoading(false);
    }
  }, [period, from, to]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}

async function fetchAllViews(
  client: ReturnType<typeof requireSupabase>,
  from: string,
  to: string,
): Promise<ViewRow[]> {
  const page = 1000;
  const out: ViewRow[] = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await client
      .from('page_views')
      .select('visitor_hash, referrer_host, path, created_at, country')
      .eq('is_bot', false)
      .gte('viewed_on', from)
      .lte('viewed_on', to)
      .order('created_at', { ascending: true })
      .range(offset, offset + page - 1);
    if (error) throw error;
    const rows = (data ?? []) as ViewRow[];
    out.push(...rows);
    if (rows.length < page) break;
    offset += page;
    if (offset > 80_000) break;
  }
  return out;
}

function countField(rows: ViewRow[], key: 'path' | 'country'): [string, number][] {
  const map = new Map<string, number>();
  for (const row of rows) {
    const v = row[key];
    if (!v) continue;
    map.set(v, (map.get(v) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}
