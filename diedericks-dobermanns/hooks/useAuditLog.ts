import { useCallback, useEffect, useRef, useState } from 'react';

import { requireSupabase } from '@/lib/supabase';
import type { Database, Json } from '@/types/database.types';

export type AuditLogEntry = {
  id: number;
  table_name: string;
  record_id: string | null;
  action: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  changed_fields: string[] | null;
  old_values: Json | null;
  new_values: Json | null;
  created_at: string;
  actor_name: string | null;
  record_label: string;
};

export type AuditLogFilters = {
  table?: string;
  action?: string;
  record?: string;
};

const PAGE_SIZE = 50;

type Raw = Database['public']['Tables']['audit_log']['Row'];

function fallbackLabel(table: string, recordId: string | null): string {
  if (!recordId) return table.replace(/_/g, ' ');
  if (recordId.length > 12) {
    return `${table.replace(/_/g, ' ')} ${recordId.slice(0, 8)}…`;
  }
  return `${table.replace(/_/g, ' ')} ${recordId}`;
}

async function resolveLabels(rows: Raw[]): Promise<{
  names: Map<string, string>;
  records: Map<string, string>;
}> {
  const client = requireSupabase();
  const actorIds = [
    ...new Set(rows.map((r) => r.actor_id).filter((id): id is string => Boolean(id))),
  ];
  const dogIds = [
    ...new Set(
      rows
        .filter((r) => r.table_name === 'dogs' && r.record_id)
        .map((r) => r.record_id!),
    ),
  ];

  const names = new Map<string, string>();
  const records = new Map<string, string>();

  const [usersRes, dogsRes] = await Promise.all([
    actorIds.length
      ? client.from('users').select('id, full_name').in('id', actorIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
    dogIds.length
      ? client.from('dogs').select('id, name').in('id', dogIds)
      : Promise.resolve({ data: [] as { id: string; name: string | null }[] }),
  ]);

  for (const u of (usersRes.data ?? []) as { id: string; full_name: string | null }[]) {
    if (u.full_name) names.set(u.id, u.full_name);
  }
  for (const d of (dogsRes.data ?? []) as { id: string; name: string | null }[]) {
    if (d.name) records.set(`dogs:${d.id}`, d.name);
  }
  for (const r of rows) {
    if (r.table_name === 'app_settings' && r.record_id) {
      records.set(`app_settings:${r.record_id}`, r.record_id.replace(/_/g, ' '));
    }
  }

  return { names, records };
}

export function useAuditLog(filters: AuditLogFilters = {}) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(0);
  const filtersKey = `${filters.table ?? ''}|${filters.action ?? ''}|${filters.record ?? ''}`;

  const fetchPage = useCallback(
    async (page: number, replace: boolean) => {
      if (replace) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }
      try {
        const client = requireSupabase();
        const from = page * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        let q = client
          .from('audit_log')
          .select(
            'id, table_name, record_id, action, actor_id, actor_email, actor_role, changed_fields, old_values, new_values, created_at',
          )
          .order('created_at', { ascending: false })
          .order('id', { ascending: false })
          .range(from, to);

        if (filters.table) q = q.eq('table_name', filters.table);
        if (filters.action) q = q.eq('action', filters.action);
        if (filters.record) q = q.eq('record_id', filters.record);

        const { data, error: err } = await q;
        if (err) throw new Error(err.message);

        const raw = (data ?? []) as Raw[];
        const { names, records } = await resolveLabels(raw);
        const mapped: AuditLogEntry[] = raw.map((row) => ({
          ...row,
          actor_name: row.actor_id ? (names.get(row.actor_id) ?? null) : null,
          record_label: row.record_id
            ? (records.get(`${row.table_name}:${row.record_id}`) ??
              fallbackLabel(row.table_name, row.record_id))
            : fallbackLabel(row.table_name, null),
        }));

        setEntries((prev) => (replace ? mapped : [...prev, ...mapped]));
        setHasMore(raw.length === PAGE_SIZE);
        pageRef.current = page;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load audit log');
        if (replace) setEntries([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [filters.table, filters.action, filters.record],
  );

  const refresh = useCallback(async () => {
    pageRef.current = 0;
    await fetchPage(0, true);
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;
    await fetchPage(pageRef.current + 1, false);
  }, [fetchPage, hasMore, loading, loadingMore]);

  useEffect(() => {
    pageRef.current = 0;
    void fetchPage(0, true);
  }, [filtersKey, fetchPage]);

  return { entries, loading, loadingMore, error, hasMore, refresh, loadMore };
}
