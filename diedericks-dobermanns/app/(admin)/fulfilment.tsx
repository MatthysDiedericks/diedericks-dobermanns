import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { formatKennelDate } from '@/lib/kennel/formatters';
import { updateDogHandover } from '@/lib/fulfilment/updateHandover';
import { realDogName } from '@/lib/dogs/placeholderName';
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
  dogCallName: string | null;
  dogId: string;
  goHome: string | null;
  handoverStatus: string | null;
  overdue: boolean;
  clientConfirmed: boolean;
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
  const [busyId, setBusyId] = useState<string | null>(null);
  const [scheduleDates, setScheduleDates] = useState<Record<string, string>>({});
  const [delivering, setDelivering] = useState<AllocatedRow | null>(null);
  const [buyerCallName, setBuyerCallName] = useState('');

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
        'id, enquirer_name, deposit_paid_date, deposit_amount, quote_id, client:users!waiting_list_client_id_fkey(full_name)',
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
        const client = r.client as unknown as { full_name: string | null } | null;
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
        `id, enquirer_name, client:users!waiting_list_client_id_fkey(full_name),
         dog:dogs!waiting_list_assigned_dog_id_fkey(id, name, call_name, handover_status, handover_date, delivered_at),
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
      const dog = r.dog as unknown as {
        id: string;
        name: string;
        call_name: string | null;
        handover_status: string | null;
        handover_date: string | null;
        delivered_at: string | null;
      } | null;
      const litter = r.litter as unknown as { go_home_date: string | null } | null;
      if (!dog || dog.handover_status === 'delivered' || dog.delivered_at) continue;
      const goHome = dog.handover_date ?? litter?.go_home_date ?? null;
      const overdue = goHome ? new Date(`${goHome}T00:00:00`) < today : false;
      const client = r.client as unknown as { full_name: string | null } | null;
      rows.push({
        id: r.id,
        name: client?.full_name ?? r.enquirer_name ?? 'Unknown',
        dogName: dog.name,
        dogCallName: dog.call_name,
        dogId: dog.id,
        goHome,
        handoverStatus: dog.handover_status,
        overdue,
        clientConfirmed: false,
      });
    }
    const dogIds = rows.map((row) => row.dogId);
    if (dogIds.length) {
      const { data: confirms } = await supabase
        .from('error_events')
        .select('entity_id')
        .eq('code', 'DELIVERY_CONFIRMED_BY_CLIENT')
        .is('resolved_at', null)
        .in('entity_id', dogIds);
      const confirmed = new Set(
        (confirms ?? []).map((e) => e.entity_id).filter((id): id is string => Boolean(id)),
      );
      for (const row of rows) {
        row.clientConfirmed = confirmed.has(row.dogId);
      }
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
        const owner = d.owner as unknown as { full_name: string | null } | null;
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

  const runHandover = async (
    dogId: string,
    patch: Parameters<typeof updateDogHandover>[0],
    then?: () => void,
  ) => {
    setBusyId(dogId);
    setError(null);
    const res = await updateDogHandover(patch);
    setBusyId(null);
    if (res.error) {
      setError(res.error);
      return;
    }
    then?.();
    await load();
  };

  if (loading) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center">
        <ActivityIndicator color={Colors.gold} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Pipeline" title="Fulfilment" />
      <Typography variant="bodyMuted" className="mb-4 px-6">
        Paid → allocated → go-home → delivered
      </Typography>
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
          ? allocated.map((r) => {
              const date = scheduleDates[r.dogId] ?? r.goHome?.slice(0, 10) ?? '';
              return (
                <View
                  key={r.id}
                  className="mb-3 rounded-sm border border-gold/20 bg-surface p-4"
                >
                  <Pressable onPress={() => router.push(`/(admin)/dogs/${r.dogId}` as never)}>
                    <Typography variant="body" className="text-cream">
                      {r.name} → {r.dogName}
                    </Typography>
                  </Pressable>
                  <Typography
                    variant="caption"
                    className={r.overdue ? 'text-danger' : 'text-silver'}
                  >
                    {statusLabel(r.handoverStatus, r.goHome)}
                    {r.overdue ? ' · OVERDUE' : ''}
                    {r.clientConfirmed ? ' · Client confirmed' : ''}
                  </Typography>
                  <View className="mt-3 flex-row flex-wrap gap-2">
                    <Button
                      label="Ready"
                      variant="ghost"
                      disabled={busyId === r.dogId}
                      onPress={() =>
                        void runHandover(r.dogId, { dogId: r.dogId, handover_status: 'ready' })
                      }
                    />
                    <TextInput
                      value={date}
                      onChangeText={(v) =>
                        setScheduleDates((prev) => ({ ...prev, [r.dogId]: v }))
                      }
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={Colors.silver}
                      className="min-w-[120px] rounded-sm border border-gold/30 px-2 py-1 text-cream"
                    />
                    <Button
                      label="Scheduled"
                      variant="ghost"
                      disabled={busyId === r.dogId || !date}
                      onPress={() =>
                        void runHandover(r.dogId, {
                          dogId: r.dogId,
                          handover_status: 'scheduled',
                          handover_date: date,
                        })
                      }
                    />
                    <Button
                      label="Mark delivered"
                      disabled={busyId === r.dogId}
                      onPress={() => {
                        setError(null);
                        setBuyerCallName(realDogName(r.dogCallName, r.dogName) ?? '');
                        setDelivering(r);
                      }}
                    />
                  </View>
                </View>
              );
            })
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
      {delivering ? (
        <View className="mx-6 mb-8 rounded-sm border border-gold/30 bg-surface p-4">
          <Typography variant="subtitle" className="text-gold">
            Name the buyer uses
          </Typography>
          <TextInput
            value={buyerCallName}
            onChangeText={setBuyerCallName}
            placeholder="Ade"
            placeholderTextColor={Colors.silver}
            className="mt-3 rounded-sm border border-gold/30 px-3 py-2 text-cream"
          />
          <View className="mt-3 flex-row flex-wrap gap-2">
            <Button
              label="Mark delivered"
              loading={busyId === delivering.dogId}
              onPress={() =>
                void runHandover(
                  delivering.dogId,
                  {
                    dogId: delivering.dogId,
                    handover_status: 'delivered',
                    delivery_method: 'collected',
                    buyerCallName,
                  },
                  () => {
                    setDelivering(null);
                    setTab('delivered');
                  },
                )
              }
            />
            <Button
              label="Cancel"
              variant="ghost"
              onPress={() => {
                setDelivering(null);
                setError(null);
              }}
            />
          </View>
        </View>
      ) : null}
    </ScreenContainer>
  );
}

function statusLabel(status: string | null, goHome: string | null): string {
  const s = status ?? 'awaiting_go_home';
  if (s === 'ready') return 'Ready';
  if (s === 'scheduled') {
    const when = goHome ? formatKennelDate(goHome) : null;
    return when && when !== '—' ? `Scheduled — ${when}` : 'Scheduled';
  }
  return 'Awaiting go-home';
}
