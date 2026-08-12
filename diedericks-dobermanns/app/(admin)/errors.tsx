import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { requireSupabase } from '@/lib/supabase';

type Row = {
  id: number;
  occurred_at: string;
  code: string;
  area: string;
  severity: string;
  message: string | null;
  email_domain: string | null;
  session_ref: string | null;
  detail: { specific_code?: string } | null;
};

type Group = {
  code: string;
  eventCount: number;
  peopleAffected: number;
  lastSeen: string;
  severity: string;
  sampleMessage: string | null;
};

/** Read-only list. Resolving stays on the website. */
export default function AdminErrorsScreen() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = requireSupabase();
      const { data, error: qErr } = await supabase
        .from('error_events' as never)
        .select(
          'id, occurred_at, code, area, severity, message, email_domain, session_ref, detail' as never,
        )
        .is('resolved_at' as never, null)
        .order('occurred_at' as never, { ascending: false })
        .limit(300);
      if (qErr) throw new Error(qErr.message);
      const rows = (data ?? []) as unknown as Row[];
      const map = new Map<string, Row[]>();
      for (const r of rows) {
        const key = r.detail?.specific_code || r.code;
        const list = map.get(key) ?? [];
        list.push(r);
        map.set(key, list);
      }
      const next: Group[] = [];
      for (const [code, list] of map) {
        const people = new Set(list.map((e) => e.session_ref || e.email_domain || `id:${e.id}`));
        next.push({
          code,
          eventCount: list.length,
          peopleAffected: people.size,
          lastSeen: list[0]!.occurred_at,
          severity: list.some((e) => e.severity === 'critical') ? 'critical' : list[0]!.severity,
          sampleMessage: list[0]?.message ?? null,
        });
      }
      next.sort((a, b) => (a.lastSeen < b.lastSeen ? 1 : -1));
      setGroups(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScreenContainer>
      <PageHeader title="System health" eyebrow="Read-only — resolve on the website" />
      {loading && !groups.length ? (
        <ActivityIndicator color={Colors.gold} className="mt-8" />
      ) : null}
      {error ? (
        <Typography variant="body" className="px-6 text-danger">
          {error}
        </Typography>
      ) : null}
      <ScrollView
        className="px-6 pb-12"
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={Colors.gold} />}
      >
        {groups.length === 0 && !loading ? (
          <Typography variant="body" className="text-subtle">
            No unresolved failures.
          </Typography>
        ) : null}
        {groups.map((g) => (
          <Pressable
            key={g.code}
            className="mb-3 rounded-xl border border-gold/20 bg-[#1C1A0E] px-4 py-3"
          >
            <Typography variant="caption" className="text-gold">
              {g.code}
            </Typography>
            <Typography variant="body" className="mt-1 text-text">
              {g.eventCount} events · {g.peopleAffected}{' '}
              {g.peopleAffected === 1 ? 'person' : 'people'} affected
            </Typography>
            <Typography variant="caption" className="mt-1 text-subtle">
              {g.severity}
              {g.sampleMessage ? ` · ${g.sampleMessage}` : ''}
            </Typography>
          </Pressable>
        ))}
        <View className="h-8" />
      </ScrollView>
    </ScreenContainer>
  );
}
