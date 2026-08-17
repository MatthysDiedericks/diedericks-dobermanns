import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { supabase } from '@/lib/supabase';

interface Counts {
  customers: number;
  subscribers: number;
  no_permission: number;
}

interface Row {
  id: string;
  full_name: string | null;
  email: string | null;
  audience: 'customer' | 'subscriber';
}

export default function MarketingScreen() {
  const [counts, setCounts] = useState<Counts>({ customers: 0, subscribers: 0, no_permission: 0 });
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data: countData, error: countErr } = await supabase.rpc(
      'marketing_audience_counts' as never,
    );
    if (countErr) {
      setError(countErr.message);
      return;
    }
    const raw = Array.isArray(countData) ? countData[0] : countData;
    const c = (raw ?? {}) as Record<string, number>;
    setCounts({
      customers: Number(c.customers ?? 0),
      subscribers: Number(c.subscribers ?? 0),
      no_permission: Number(c.no_permission ?? 0),
    });

    const [cust, subs] = await Promise.all([
      supabase.rpc('marketing_audience_ids' as never, { p_audience: 'customers' } as never),
      supabase.rpc('marketing_audience_ids' as never, { p_audience: 'subscribers' } as never),
    ]);
    const custIds = ((cust.data ?? []) as { contact_id: string }[]).map((r) => r.contact_id);
    const subIds = ((subs.data ?? []) as { contact_id: string }[]).map((r) => r.contact_id);
    const allIds = [...new Set([...custIds, ...subIds])];
    if (!allIds.length) {
      setRows([]);
      return;
    }
    const { data: contacts } = await supabase
      .from('contacts')
      .select('id, full_name, email, merged_into_contact_id, is_do_not_sell')
      .in('id', allIds);
    const list: Row[] = [];
    (contacts ?? []).forEach((row) => {
      if (row.merged_into_contact_id || row.is_do_not_sell || !row.email) return;
      if (custIds.includes(row.id)) {
        list.push({
          id: row.id,
          full_name: row.full_name,
          email: row.email,
          audience: 'customer',
        });
      } else if (subIds.includes(row.id)) {
        list.push({
          id: row.id,
          full_name: row.full_name,
          email: row.email,
          audience: 'subscriber',
        });
      }
    });
    setRows(list.sort((a, b) => (a.full_name ?? '').localeCompare(b.full_name ?? '')));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Growth" title="Marketing" />
      <View className="px-6">
        <View className="flex-row gap-3">
          <Card className="flex-1">
            <Typography variant="displayLg" className="text-gold">{counts.customers}</Typography>
            <Typography variant="caption" className="mt-1">Customers</Typography>
          </Card>
          <Card className="flex-1">
            <Typography variant="displayLg" className="text-gold">{counts.subscribers}</Typography>
            <Typography variant="caption" className="mt-1">Subscribers</Typography>
          </Card>
          <Card className="flex-1">
            <Typography variant="displayLg" className="text-gold">{counts.no_permission}</Typography>
            <Typography variant="caption" className="mt-1">No permission</Typography>
          </Card>
        </View>
        <Typography variant="caption" className="mt-4">
          {counts.no_permission} contacts have not given permission. Ask for it on the application
          form and the website sign-up. Campaigns are sent from the website — this list cannot
          include anyone without a lawful basis.
        </Typography>
        {error ? <Typography variant="caption" className="mt-2 text-danger">{error}</Typography> : null}
      </View>

      <View className="mt-6 gap-3 px-6">
        {rows.length === 0 ? (
          <EmptyState
            title="Nobody to mail yet"
            message="Customers (a dog or a paid deposit) and subscribers appear here."
          />
        ) : (
          rows.map((r) => (
            <Card key={`${r.audience}-${r.id}`} className="flex-row items-center">
              <View className="flex-1">
                <Typography variant="subtitle">{r.full_name ?? 'Unnamed'}</Typography>
                <Typography variant="caption" className="mt-0.5">{r.email}</Typography>
              </View>
              <Badge label={r.audience === 'customer' ? 'Customer' : 'Subscriber'} tone="gold" />
            </Card>
          ))
        )}
      </View>
    </ScreenContainer>
  );
}
