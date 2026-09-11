import { useCallback, useEffect, useState } from 'react';

import {
  buildFunnelSnapshot,
  emptyFunnelSnapshot,
  parseFunnelRange,
  rangeIsoBounds,
  type FunnelSnapshot,
  type StepEventRow,
} from '@/lib/applications/funnel';
import { requireSupabase } from '@/lib/supabase';

export type FunnelLoad = {
  snapshot: FunnelSnapshot;
  trackingReady: boolean;
  loading: boolean;
};

function trackingTableMissing(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes('application_step_events') &&
    (m.includes('does not exist') ||
      m.includes('could not find') ||
      m.includes('schema cache') ||
      m.includes('42p01'))
  );
}

export function useApplicationFunnel(fromRaw?: string, toRaw?: string) {
  const range = parseFunnelRange(fromRaw, toRaw);
  const [from, setFrom] = useState(range.from);
  const [to, setTo] = useState(range.to);
  const [snapshot, setSnapshot] = useState<FunnelSnapshot>(emptyFunnelSnapshot(range.from, range.to));
  const [trackingReady, setTrackingReady] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fromRaw || !toRaw) return;
    const next = parseFunnelRange(fromRaw, toRaw);
    setFrom(next.from);
    setTo(next.to);
  }, [fromRaw, toRaw]);

  const refresh = useCallback(async (nextFrom = from, nextTo = to) => {
    setLoading(true);
    setError(null);
    const empty = emptyFunnelSnapshot(nextFrom, nextTo);
    try {
      const client = requireSupabase();
      const { startIso, endExclusiveIso } = rangeIsoBounds(nextFrom, nextTo);
      const [views, events, apps] = await Promise.all([
        client
          .from('page_views')
          .select('id', { count: 'exact', head: true })
          .eq('path', '/apply')
          .eq('is_bot', false)
          .gte('viewed_on', nextFrom)
          .lte('viewed_on', nextTo),
        client
          .from('application_step_events')
          .select('submission_id, step_number, step_name, occurred_at, device, note')
          .gte('occurred_at', startIso)
          .lt('occurred_at', endExclusiveIso)
          .limit(20000),
        client
          .from('applications')
          .select('submission_id')
          .gte('created_at', startIso)
          .lt('created_at', endExclusiveIso),
      ]);

      if (events.error) {
        if (trackingTableMissing(events.error.message)) {
          setSnapshot(empty);
          setTrackingReady(false);
          return;
        }
        throw events.error;
      }

      setTrackingReady(true);
      setSnapshot(
        buildFunnelSnapshot({
          from: nextFrom,
          to: nextTo,
          pageViews: views.count ?? 0,
          submitted: (apps.data ?? []).length,
          events: (events.data ?? []) as StepEventRow[],
          applications: (apps.data ?? []) as { submission_id: string | null }[],
        }),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load funnel';
      if (trackingTableMissing(message)) {
        setSnapshot(empty);
        setTrackingReady(false);
      } else {
        setError(message);
        setSnapshot(empty);
      }
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    snapshot,
    trackingReady,
    loading,
    error,
    from,
    to,
    setFrom,
    setTo,
    applyRange: () => void refresh(from, to),
    refresh,
  };
}
