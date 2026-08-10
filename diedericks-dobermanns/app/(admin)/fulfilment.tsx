import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { formatKennelDate } from '@/lib/kennel/formatters';
import { supabase } from '@/lib/supabase';

type Tab = 'waiting' | 'allocated' | 'delivered';

type WaitingRow = {
  id: string;
  name: string;
  deposit_paid_date: string | null;
  deposit_amount: number | null;
  quote_id: string | null;
};

type AllocatedRow = {
  id: string;
  name: string;
  dogName: string;
  dogId: string;
  goHome: string | null;
  overdue: boolean;
};

/**
 * Daily fulfilment board — parity with web `/admin/fulfilment`.
 * Paid & waiting / allocated not delivered / delivered.
 */
export default function FulfilmentScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('waiting');
  const [waiting, setWaiting] = useState<WaitingRow[]>([]);
  const [allocated, setAllocated] = useState<AllocatedRow[]>([]);
  const [delivered, setDelivered] = useState<
    { dogId: string; dogName: string; clientName: string; deliveredAt: string | null }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) {
      setError('Supabase not configured');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);

    const { data: wait, error: wErr } = await supabase
      .from('waiting_list')
      .select(
        'id, enquirer_name, deposit_paid_date, deposit_amount, quote_id, client:users(full_name)',
      )
      .in('payment_status', ['deposit_paid', 'paid_in_full'])
      .is('assigned_dog_id', null)
      .eq('status', 'active')
      .order('deposit_paid_date', { ascending: true });
    if (wErr) {
      setError(wErr.message);
      setLoading(false);
      return;
    }
    setWaiting(
      (wait ?? []).map((r) => {
        const client = r.client as { full_name: string | null } | null;
        return {
          id: r.id,
          name: client?.full_name ?? r.enquirer_name ?? 'Unknown',
          deposit_paid_date: r.deposit_paid_date,
          deposit_amount: r.deposit_amount,
          quote_id: r.quote_id,
        };
      }),
    );

    const { data: alloc, error: aErr } = await supabase
      .from('waiting_list')
      .select(
        `id, enquirer_name, client:users(full_name),
         dog:dogs!waiting_list_assigned_dog_id_fkey(id, name, handover_status, handover_date, delivered_at),
         litter:litters!waiting_list_assigned_litter_id_fkey(go_home_date)`,
      )
      .not('assigned_dog_id', 'is', null)
      .eq('status', 'active');
    if (aErr) {
      setError(aErr.message);
      setLoading(false);
      return;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const rows: AllocatedRow[] = [];
    for (const r of alloc ?? []) {
      const dog = r.dog as {
        id: string;
        name: string;
        handover_status: string | null;
        handover_date: string | null;
        delivered_at: string | null;
      } | null;
      const litter = r.litter as { go_home_date: string | null } | null;
      if (!dog || dog.handover_status === 'delivered' || dog.delivered_at) continue;
      const goHome = dog.handover_date ?? litter?.go_home_date ?? null;
      const overdue = goHome ? new Date(`${goHome}T00:00:00`) < today : false;
      const client = r.client as { full_name: string | null } | null;
      rows.push({
        id: r.id,
        name: client?.full_name ?? r.enquirer_name ?? 'Unknown',
        dogName: dog.name,
        dogId: dog.id,
        goHome,
        overdue,
      });
    }
    setAllocated(rows);

    const { data: done } = await supabase
      .from('dogs')
      .select('id, name, delivered_at, owner:users!dogs_owner_id_fkey(full_name)')
      .eq('handover_status' as never, 'delivered')
      .order('delivered_at' as never, { ascending: false })
      .limit(30);
    setDelivered(
      (done ?? []).map((d) => {
        const owner = d.owner as { full_name: string | null } | null;
        return {
          dogId: d.id,
          dogName: d.name,
          clientName: owner?.full_name ?? '—',
          deliveredAt: (d as { delivered_at?: string | null }).delivered_at ?? null,
        };
      }),
    );

    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center">
        <ActivityIndicator color={Colors.gold} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <PageHeader
        eyebrow="Pipeline"
        title="Fulfilment"
        subtitle="Paid → allocated → go-home → delivered"
      />
      {error ? (
        <Typography variant="body" className="px-6 text-danger">
          {error}
        </Typography>
      ) : null}

      <View className="flex-row flex-wrap gap-2 px-6">
        {(
          [
            ['waiting', `Waiting (${waiting.length})`],
            ['allocated', `Allocated (${allocated.length})`],
            ['delivered', `Delivered (${delivered.length})`],
          ] as const
        ).map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setTab(key)}
            className={`rounded-sm border px-3 py-2 ${
              tab === key ? 'border-gold bg-gold/20' : 'border-gold/30'
            }`}
          >
            <Typography variant="caption" className="text-gold">
              {label}
            </Typography>
          </Pressable>
        ))}
      </View>

      <View className="mt-4 px-6">
        {tab === 'waiting' && waiting.length === 0 ? (
          <EmptyState title="None waiting" message="No paid clients without a dog." />
        ) : null}
        {tab === 'waiting'
          ? waiting.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => router.push(`/(admin)/waitlist/${r.id}`)}
                className="mb-3 rounded-sm border border-gold/20 bg-surface p-4"
              >
                <Typography variant="body" className="text-cream">
                  {r.name}
                </Typography>
                <Typography variant="caption" className="text-silver">
                  Paid {formatKennelDate(r.deposit_paid_date)} · R{r.deposit_amount ?? 0}
                </Typography>
              </Pressable>
            ))
          : null}

        {tab === 'allocated' && allocated.length === 0 ? (
          <EmptyState title="None pending" message="No allocated dogs awaiting handover." />
        ) : null}
        {tab === 'allocated'
          ? allocated.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => router.push(`/(admin)/dogs/${r.dogId}`)}
                className="mb-3 rounded-sm border border-gold/20 bg-surface p-4"
              >
                <Typography variant="body" className="text-cream">
                  {r.name} → {r.dogName}
                </Typography>
                <Typography
                  variant="caption"
                  className={r.overdue ? 'text-danger' : 'text-silver'}
                >
                  Go-home {formatKennelDate(r.goHome)}
                  {r.overdue ? ' · OVERDUE' : ''}
                </Typography>
              </Pressable>
            ))
          : null}

        {tab === 'delivered' && delivered.length === 0 ? (
          <EmptyState title="No deliveries" message="Mark a dog delivered to see it here." />
        ) : null}
        {tab === 'delivered'
          ? delivered.map((r) => (
              <Pressable
                key={r.dogId}
                onPress={() => router.push(`/(admin)/dogs/${r.dogId}`)}
                className="mb-3 rounded-sm border border-gold/20 bg-surface p-4"
              >
                <Typography variant="body" className="text-cream">
                  {r.clientName} · {r.dogName}
                </Typography>
                <Typography variant="caption" className="text-silver">
                  {formatKennelDate(r.deliveredAt)}
                </Typography>
              </Pressable>
            ))
          : null}
      </View>
    </ScreenContainer>
  );
}
