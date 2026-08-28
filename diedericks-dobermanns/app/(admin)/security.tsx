import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { ERROR_CODES } from '@/lib/errors/codes';
import { requireSupabase } from '@/lib/supabase';

const CODES = [
  ERROR_CODES.SECURITY_RATE_LIMIT,
  ERROR_CODES.SECURITY_HONEYPOT,
  ERROR_CODES.SECURITY_UPLOAD_REJECTED,
  ERROR_CODES.SECURITY_AUTH_LOCKOUT,
  ERROR_CODES.SECURITY_RPC_DENIED,
  ERROR_CODES.SECURITY_TOKEN_INVALID,
] as const;

type Row = { id: number; occurred_at: string; code: string; message: string | null };
type PreviewRow = {
  id: number;
  created_at: string;
  actor_email: string | null;
  new_values: { client_name?: string } | null;
};

/** Read-only summary. Filtering stays on the website. */
export default function AdminSecurityScreen() {
  const [rows, setRows] = useState<Row[]>([]);
  const [previews, setPreviews] = useState<PreviewRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = requireSupabase();
      const since = new Date(Date.now() - 30 * 24 * 3_600_000).toISOString();
      const [{ data, error: qErr }, { data: countRows, error: cErr }, { data: previewRows }] =
        await Promise.all([
          supabase
            .from('error_events' as never)
            .select('id, occurred_at, code, message' as never)
            .like('code' as never, 'SECURITY_%')
            .gte('occurred_at' as never, since)
            .order('occurred_at' as never, { ascending: false })
            .limit(40),
          supabase
            .from('error_events' as never)
            .select('code' as never)
            .like('code' as never, 'SECURITY_%')
            .gte('occurred_at' as never, since)
            .limit(2000),
          supabase
            .from('audit_log')
            .select('id, created_at, actor_email, new_values')
            .eq('action', 'preview')
            .eq('table_name', 'users')
            .order('created_at', { ascending: false })
            .limit(20),
        ]);
      if (qErr) throw new Error(qErr.message);
      if (cErr) throw new Error(cErr.message);
      const list = (data ?? []) as unknown as Row[];
      const next: Record<string, number> = {};
      for (const c of CODES) next[c] = 0;
      for (const r of (countRows ?? []) as unknown as { code: string }[]) {
        next[r.code] = (next[r.code] ?? 0) + 1;
      }
      setCounts(next);
      setRows(list);
      setPreviews((previewRows ?? []) as unknown as PreviewRow[]);
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
      <PageHeader title="Security" eyebrow="Read-only — detail on the website" />
      {loading && !rows.length ? (
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
        <View className="mb-6 flex-row flex-wrap gap-2">
          {CODES.map((c) => (
            <View key={c} className="rounded-xl border border-gold/20 bg-[#1C1A0E] px-3 py-2">
              <Typography variant="caption" className="text-gold">
                {c.replace('SECURITY_', '')}
              </Typography>
              <Typography variant="subtitle" className="text-text">
                {counts[c] ?? 0}
              </Typography>
            </View>
          ))}
        </View>
        {rows.length === 0 && !loading ? (
          <Typography variant="body" className="text-subtle">
            No security events in the last 30 days.
          </Typography>
        ) : null}
        {rows.map((r) => (
          <View key={r.id} className="mb-3 rounded-xl border border-gold/20 bg-[#1C1A0E] px-4 py-3">
            <Typography variant="caption" className="text-gold">
              {r.code}
            </Typography>
            <Typography variant="body" className="mt-1 text-text">
              {r.message ?? '—'}
            </Typography>
            <Typography variant="caption" className="mt-1 text-subtle">
              {new Date(r.occurred_at).toLocaleString()}
            </Typography>
          </View>
        ))}
        <Typography variant="subtitle" className="mb-3 mt-8 text-gold">
          Portal previews
        </Typography>
        {previews.length === 0 ? (
          <Typography variant="body" className="text-subtle">
            No portal previews logged yet.
          </Typography>
        ) : (
          previews.map((p) => (
            <View key={p.id} className="mb-3 rounded-xl border border-gold/20 bg-[#1C1A0E] px-4 py-3">
              <Typography variant="caption" className="text-gold">
                {p.new_values?.client_name || 'Client'}
              </Typography>
              <Typography variant="body" className="mt-1 text-text">
                {p.actor_email ?? 'Admin'} previewed this portal
              </Typography>
              <Typography variant="caption" className="mt-1 text-subtle">
                {new Date(p.created_at).toLocaleString()}
              </Typography>
            </View>
          ))
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
