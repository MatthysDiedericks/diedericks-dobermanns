import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Switch, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { stockStatusFor, type StockPresenceKey } from '@/lib/equipment/display';
import { isStarterCatalogueItem } from '@/lib/finance/catalogue';
import {
  deactivateCatalogueItem,
  fetchStockList,
  reactivateCatalogueItem,
  setCatalogueClientVisible,
  type StockListItem,
} from '@/lib/finance/catalogueQueries';
import { formatAmount, formatDate, humanizeItemType } from '@/lib/finance/formatters';

type FilterKey = 'all' | StockPresenceKey;

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'live', label: 'Live in shop' },
  { key: 'no_photo', label: 'No photo' },
  { key: 'internal', label: 'Internal only' },
  { key: 'inactive', label: 'Inactive' },
];

const TONE: Record<StockPresenceKey, BadgeTone> = {
  live: 'success',
  no_photo: 'gold',
  internal: 'muted',
  inactive: 'danger',
};

function priceLabel(it: StockListItem): string {
  if (it.price_varies) return 'On request';
  return formatAmount(it.default_price);
}

function counters(items: StockListItem[]) {
  const c = { live: 0, no_photo: 0, internal: 0, inactive: 0, total: items.length };
  for (const it of items) c[stockStatusFor(it).key]++;
  return c;
}

export default function StockScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<StockListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [busyId, setBusyId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchStockList());
    } catch (e) {
      Alert.alert('Could not load stock', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const counts = useMemo(() => counters(rows), [rows]);
  const visible = useMemo(
    () => (filter === 'all' ? rows : rows.filter((it) => stockStatusFor(it).key === filter)),
    [rows, filter],
  );

  const patch = (id: string, next: Partial<StockListItem>) => {
    setRows((prev) =>
      prev.map((it) =>
        it.id === id ? { ...it, ...next, updated_at: new Date().toISOString() } : it,
      ),
    );
  };

  const onActive = async (it: StockListItem, value: boolean) => {
    setBusyId(it.id);
    const res = value ? await reactivateCatalogueItem(it.id) : await deactivateCatalogueItem(it.id);
    setBusyId(null);
    if (res.error) {
      Alert.alert('Could not update', res.error);
      return;
    }
    patch(it.id, { is_active: value });
  };

  const onVisible = async (it: StockListItem, value: boolean) => {
    setBusyId(it.id);
    const res = await setCatalogueClientVisible(it.id, value);
    setBusyId(null);
    if (res.error) {
      Alert.alert('Could not update', res.error);
      return;
    }
    patch(it.id, { is_client_visible: value });
  };

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Retail" title="Stock" />
      <View className="gap-4 px-6 pb-10">
        <Typography variant="bodyMuted">
          What is loaded, and whether it is actually reaching the shop.
        </Typography>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2 pb-1">
            {(
              [
                { key: 'live' as const, label: 'Live in shop', value: counts.live },
                { key: 'no_photo' as const, label: 'In shop, no photo', value: counts.no_photo },
                { key: 'internal' as const, label: 'Internal only', value: counts.internal },
                { key: 'inactive' as const, label: 'Inactive', value: counts.inactive },
                { key: 'all' as const, label: 'Total items', value: counts.total },
              ] as const
            ).map((c) => (
              <Pressable
                key={c.key}
                onPress={() => setFilter(c.key)}
                className={`min-w-[110px] rounded-lg border px-4 py-3 ${
                  filter === c.key ? 'border-gold bg-gold/15' : 'border-gold/20 bg-surface'
                }`}
              >
                <Typography variant="caption" className="text-silver">
                  {c.label}
                </Typography>
                <Typography variant="subtitle" className="text-gold">
                  {c.value}
                </Typography>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2 pb-1">
            {FILTERS.map((f) => (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                className={`rounded-full border px-4 py-2 ${
                  filter === f.key ? 'border-gold bg-gold/15' : 'border-gold/30'
                }`}
              >
                <Typography
                  variant="caption"
                  className={filter === f.key ? 'text-gold' : 'text-silver'}
                >
                  {f.label}
                </Typography>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        {loading && rows.length === 0 ? (
          <Typography variant="bodyMuted">Loading…</Typography>
        ) : visible.length === 0 ? (
          <EmptyState title="No items" message="Nothing matches this filter." />
        ) : (
          visible.map((it) => {
            const status = stockStatusFor(it);
            const starter = isStarterCatalogueItem(it);
            return (
              <Card key={it.id} className="gap-3 p-4">
                <View>
                  <Typography variant="subtitle">{it.label}</Typography>
                  {it.short_description ? (
                    <Typography variant="caption" className="mt-1 text-silver">
                      {it.short_description}
                    </Typography>
                  ) : null}
                  {starter ? (
                    <Typography variant="caption" className="mt-1 italic text-gold">
                      Starter suggestion — not loaded by you.
                    </Typography>
                  ) : null}
                </View>
                <Badge label={status.label} tone={TONE[status.key]} />
                {status.reason ? (
                  <Typography variant="caption" className="text-silver">
                    {status.reason}
                  </Typography>
                ) : null}
                <View className="flex-row items-center justify-between">
                  <Typography variant="body">{priceLabel(it)}</Typography>
                  <View className="items-end">
                    <Typography variant="caption" className="text-silver">
                      {humanizeItemType(it.equipment_type || it.item_type)} · {it.quote_lines} quotes
                    </Typography>
                    {it.quote_lines > 0 ? (
                      <Typography variant="caption" className="text-gold">
                        Do not delete
                      </Typography>
                    ) : null}
                  </View>
                </View>
                <Typography variant="caption" className="text-subtle">
                  Updated {formatDate(it.updated_at)}
                </Typography>
                <View className="flex-row gap-3">
                  <View className="flex-1 flex-row items-center justify-between rounded-lg border border-gold/20 px-3 py-2">
                    <Typography variant="caption">Active</Typography>
                    <Switch
                      value={it.is_active}
                      disabled={busyId === it.id}
                      onValueChange={(v) => void onActive(it, v)}
                      trackColor={{ false: Colors.silver, true: Colors.gold }}
                      thumbColor={Colors.white}
                    />
                  </View>
                  <View className="flex-1 flex-row items-center justify-between rounded-lg border border-gold/20 px-3 py-2">
                    <Typography variant="caption">In shop</Typography>
                    <Switch
                      value={it.is_client_visible}
                      disabled={busyId === it.id}
                      onValueChange={(v) => void onVisible(it, v)}
                      trackColor={{ false: Colors.silver, true: Colors.gold }}
                      thumbColor={Colors.white}
                    />
                  </View>
                </View>
                <Pressable
                  onPress={() =>
                    router.push({
                      pathname: '/(admin)/settings/catalogue',
                      params: { item: it.id },
                    })
                  }
                >
                  <Typography variant="caption" className="text-gold">
                    Edit
                  </Typography>
                </Pressable>
              </Card>
            );
          })
        )}
      </View>
    </ScreenContainer>
  );
}
