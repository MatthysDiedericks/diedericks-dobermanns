import { useMemo } from 'react';

import { useWaitingList } from '@/hooks/useWaitingList';
import { effectiveStage } from '@/lib/waitlist/helpers';
import type { WaitingListEntry } from '@/types/app.types';

export type FollowUpGroup = 'overdue' | 'today' | 'week' | 'upcoming';

function followUpGroup(entry: WaitingListEntry, today: string, weekEnd: string): FollowUpGroup | null {
  if (!entry.follow_up_date) return null;
  const d = entry.follow_up_date;
  if (d < today) return 'overdue';
  if (d === today) return 'today';
  if (d <= weekEnd) return 'week';
  return 'upcoming';
}

export function useFollowUps() {
  const { data, loading, refresh, overdueCount } = useWaitingList();

  const grouped = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const weekEndDate = new Date();
    weekEndDate.setDate(weekEndDate.getDate() + 7);
    const weekEnd = weekEndDate.toISOString().slice(0, 10);

    const buckets: Record<FollowUpGroup, WaitingListEntry[]> = {
      overdue: [],
      today: [],
      week: [],
      upcoming: [],
    };

    for (const entry of data) {
      if (effectiveStage(entry) === 'do_not_sell' || effectiveStage(entry) === 'withdrawn') continue;
      const g = followUpGroup(entry, today, weekEnd);
      if (!g || g === 'upcoming') continue;
      buckets[g].push(entry);
    }

    return buckets;
  }, [data]);

  const dueCount = grouped.overdue.length + grouped.today.length;

  return { grouped, loading, refresh, overdueCount, dueCount };
}
