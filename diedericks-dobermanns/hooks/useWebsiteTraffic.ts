import { useCallback, useEffect, useState } from 'react';

import { requireSupabase } from '@/lib/supabase';

export type WebsiteTrafficStats = {
  viewsToday: number;
  visitorsToday: number;
  viewsWeek: number;
  visitorsWeek: number;
  topPages: [string, number][];
  topCountries: [string, number][];
  hasAnyData: boolean;
};

const empty: WebsiteTrafficStats = {
  viewsToday: 0,
  visitorsToday: 0,
  viewsWeek: 0,
  visitorsWeek: 0,
  topPages: [],
  topCountries: [],
  hasAnyData: false,
};

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function countField(rows: { value: string | null }[]): [string, number][] {
  const map = new Map<string, number>();
  for (const row of rows) {
    if (!row.value) continue;
    map.set(row.value, (map.get(row.value) ?? 0) + 1);
  }
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

/**
 * Read-only website traffic for the admin analytics screen.
 * Does NOT call record_page_view — the Expo app must never pollute website counts.
 */
export function useWebsiteTraffic() {
  const [data, setData] = useState<WebsiteTrafficStats>(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const client = requireSupabase();
      const today = todayIso();
      const weekStart = isoDaysAgo(6);
      const monthStart = isoDaysAgo(29);

      const [{ data: daily, error: dailyErr }, { count: anyCount }] = await Promise.all([
        client
          .from('page_view_daily')
          .select('viewed_on, views, visitors')
          .gte('viewed_on', weekStart)
          .order('viewed_on', { ascending: true }),
        client.from('page_views').select('id', { count: 'exact', head: true }).limit(1),
      ]);
      if (dailyErr) throw dailyErr;

      const rows = (daily ?? []) as { viewed_on: string; views: number; visitors: number }[];
      const todayRow = rows.find((r) => r.viewed_on === today);
      const viewsWeek = rows.reduce((s, r) => s + (Number(r.views) || 0), 0);
      const visitorsWeek = rows.reduce((s, r) => s + (Number(r.visitors) || 0), 0);

      const [{ data: pathRows }, { data: countryRows }] = await Promise.all([
        client
          .from('page_views')
          .select('path')
          .eq('is_bot', false)
          .gte('viewed_on', monthStart)
          .limit(3000),
        client
          .from('page_views')
          .select('country')
          .eq('is_bot', false)
          .gte('viewed_on', monthStart)
          .not('country', 'is', null)
          .limit(3000),
      ]);

      setData({
        viewsToday: todayRow ? Number(todayRow.views) || 0 : 0,
        visitorsToday: todayRow ? Number(todayRow.visitors) || 0 : 0,
        viewsWeek,
        visitorsWeek,
        topPages: countField(
          ((pathRows ?? []) as { path: string | null }[]).map((r) => ({ value: r.path })),
        ).slice(0, 5),
        topCountries: countField(
          ((countryRows ?? []) as { country: string | null }[]).map((r) => ({
            value: r.country,
          })),
        ).slice(0, 5),
        hasAnyData: (anyCount ?? 0) > 0 || rows.length > 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load website traffic');
      setData(empty);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, error, refresh };
}
