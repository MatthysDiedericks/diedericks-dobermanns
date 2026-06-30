import { useCallback, useEffect, useMemo, useState } from 'react';

import { requireSupabase, supabase } from '@/lib/supabase';
import type { TablesInsert } from '@/types/database.types';

export interface PuppyHealthRecord {
  id: string;
  litter_id: string | null;
  dog_id: string | null;
  record_type: string;
  record_date: string;
  type_label: string;
  description: string;
  notes: string | null;
  administered_by: string | null;
  next_due_date: string | null;
}

export function useLitterHealth(litterId: string) {
  const [records, setRecords] = useState<PuppyHealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!litterId || !supabase) {
      setRecords([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error: err } = await requireSupabase()
        .from('puppy_health_records')
        .select('*')
        .eq('litter_id', litterId)
        .order('record_date', { ascending: false });
      if (err) throw new Error(err.message);
      setRecords((data ?? []) as PuppyHealthRecord[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load health records');
    } finally {
      setLoading(false);
    }
  }, [litterId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const today = new Date().toISOString().slice(0, 10);
  const { upcoming, past } = useMemo(() => {
    const up: PuppyHealthRecord[] = [];
    const pa: PuppyHealthRecord[] = [];
    for (const r of records) {
      const due = r.next_due_date ?? r.record_date;
      if (due >= today) up.push(r);
      else pa.push(r);
    }
    return { upcoming: up, past: pa };
  }, [records, today]);

  const addRecord = useCallback(
    async (payload: Omit<TablesInsert<'puppy_health_records'>, 'litter_id'>, puppyIds: string[]) => {
      const client = requireSupabase();
      const rows: TablesInsert<'puppy_health_records'>[] =
        puppyIds.length === 0
          ? [{ ...payload, litter_id: litterId, dog_id: null }]
          : puppyIds.map((dog_id) => ({ ...payload, litter_id: litterId, dog_id }));
      const { error: err } = await client.from('puppy_health_records').insert(rows);
      if (err) throw new Error(err.message);
      await refresh();
    },
    [litterId, refresh],
  );

  const deleteRecord = useCallback(
    async (id: string) => {
      const { error: err } = await requireSupabase()
        .from('puppy_health_records')
        .delete()
        .eq('id', id);
      if (err) throw new Error(err.message);
      await refresh();
    },
    [refresh],
  );

  return { records, upcoming, past, loading, error, refresh, addRecord, deleteRecord };
}
