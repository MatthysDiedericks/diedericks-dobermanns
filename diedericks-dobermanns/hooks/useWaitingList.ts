import { useCallback, useEffect, useMemo, useState } from 'react';

import { MOCK_WAITING_LIST } from '@/lib/mockData';
import { supabase } from '@/lib/supabase';
import { isFollowUpOverdue } from '@/lib/waitlist/constants';
import { effectiveStage } from '@/lib/waitlist/helpers';
import { WAITLIST_SELECT, WAITLIST_TYPE_SELECT } from '@/lib/waitlist/queries';
import type { WaitingListEntry, WaitingListType } from '@/types/app.types';

export function useWaitingList() {
  const [data, setData] = useState<WaitingListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!supabase) {
        setData(MOCK_WAITING_LIST);
        return;
      }
      const { data: rows, error: err } = await supabase
        .from('waiting_list')
        .select(WAITLIST_SELECT)
        .order('position', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: true });
      if (err) throw new Error(err.message);
      setData((rows ?? []) as unknown as WaitingListEntry[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load waiting list');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const overdueCount = useMemo(
    () => data.filter((e) => isFollowUpOverdue(e.follow_up_date)).length,
    [data],
  );

  return { data, loading, error, refresh, overdueCount };
}

export function useWaitlistTypes() {
  const [types, setTypes] = useState<WaitingListType[]>([]);

  const refresh = useCallback(async () => {
    if (!supabase) {
      setTypes([
        { id: 't1', name: 'Standard Puppy', slug: 'standard-puppy', colour: '#C4A35A', sort_order: 1, is_system: true, created_at: '' },
        { id: 't5', name: 'Do Not Sell', slug: 'do-not-sell', colour: '#EF4444', sort_order: 99, is_system: true, created_at: '' },
      ]);
      return;
    }
    const { data } = await supabase
      .from('waiting_list_types')
      .select(WAITLIST_TYPE_SELECT)
      .order('sort_order');
    setTypes((data ?? []) as WaitingListType[]);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { types, refresh };
}

export function useWaitlistEntry(id: string) {
  const [entry, setEntry] = useState<WaitingListEntry | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    if (!supabase) {
      setEntry(MOCK_WAITING_LIST.find((e) => e.id === id) ?? null);
      setLoading(false);
      return;
    }
    const { data } = await supabase.from('waiting_list').select(WAITLIST_SELECT).eq('id', id).single();
    setEntry((data as unknown as WaitingListEntry) ?? null);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { entry, loading, refresh };
}

export function filterWaitlistEntries(
  entries: WaitingListEntry[],
  opts: {
    listTypeId?: string | null;
    stage?: string | null;
    priority?: string | null;
    search?: string;
    excludeDoNotSell?: boolean;
  },
): WaitingListEntry[] {
  const q = opts.search?.trim().toLowerCase() ?? '';
  return entries.filter((e) => {
    if (opts.excludeDoNotSell && effectiveStage(e) === 'do_not_sell') return false;
    if (opts.listTypeId && e.list_type_id !== opts.listTypeId) return false;
    if (opts.stage && effectiveStage(e) !== opts.stage) return false;
    if (opts.priority && e.priority !== opts.priority) return false;
    if (!q) return true;
    const hay = [
      e.client?.full_name,
      e.enquirer_name,
      e.enquirer_email,
      e.client?.email,
      e.preference_notes,
      e.admin_notes,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });
}
