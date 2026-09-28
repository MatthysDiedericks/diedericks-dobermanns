import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { formatAmount, formatDate } from '@/lib/finance/formatters';
import { onHandValue } from '@/lib/stock/ledger';
import { fetchProductStockList } from '@/lib/stock/queries';
import { marginPercent, productCategoryLabel, type ProductStock } from '@/lib/stock/types';

export default function StockScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<ProductStock[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchProductStockList());
    } catch (e) {
      Alert.alert('Could not load stock', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const counts = useMemo(() => {
    const value = onHandValue(rows);
    return {
      value,
      reorder: rows.filter((p) => p.needs_reorder).length,
      out: rows.filter((p) => p.qty_on_hand <= 0).length,
      shop: rows.filter((p) => p.is_active && p.is_client_visible).length,
      total: rows.length,
    };
  }, [rows]);

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Retail" title="Stock" />
      <View className="gap-4 px-6 pb-10">
        <Typography variant="bodyMuted">
          Physical products on the shelf. Quantity on hand is the ledger, not a typed number.
        </Typography>
        <View className="flex-row flex-wrap gap-2">
          <Counter label="On hand" value={formatAmount(counts.value)} />
          <Counter label="Reorder" value={String(counts.reorder)} />
          <Counter label="Out" value={String(counts.out)} />
          <Counter label="In shop" value={String(counts.shop)} />
        </View>
        <Button label="Receive stock" onPress={() => router.push('/(admin)/stock/receive' as never)} />
        <Button
          label="New product"
          variant="outline"
          onPress={() => router.push('/(admin)/stock/new' as never)}
        />
        {loading && rows.length === 0 ? (
          <Typography variant="bodyMuted">Loading…</Typography>
        ) : rows.length === 0 ? (
          <EmptyState
            title="No products yet"
            message="Receive a delivery or add a product. Services and fees live under Settings."
          />
        ) : (
          rows.map((p) => {
            const margin = marginPercent(p.cost_price, p.sell_price);
            return (
              <Pressable key={p.id} onPress={() => router.push(`/(admin)/stock/${p.id}` as never)}>
                <Card className="gap-1 p-4">
                  <Typography variant="subtitle">{p.name}</Typography>
                  <Typography variant="caption" className="text-silver">
                    {p.sku} · {productCategoryLabel(p.category)} · {p.qty_on_hand} on hand
                  </Typography>
                  <Typography variant="caption" className="text-subtle">
                    {formatAmount(p.cost_price)} cost · {formatAmount(p.sell_price)} sell
                    {margin == null ? '' : ` · ${margin.toFixed(0)}%`}
                    {p.last_movement_at ? ` · ${formatDate(p.last_movement_at)}` : ''}
                  </Typography>
                </Card>
              </Pressable>
            );
          })
        )}
      </View>
    </ScreenContainer>
  );
}

function Counter({ label, value }: { label: string; value: string }) {
  return (
    <View className="min-w-[30%] flex-1 rounded-lg border border-gold/20 bg-surface px-3 py-3">
      <Typography variant="caption" className="text-silver">
        {label}
      </Typography>
      <Typography variant="subtitle" className="text-gold">
        {value}
      </Typography>
    </View>
  );
}
