import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, TextInput, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { formatAmount, formatDate } from '@/lib/finance/formatters';
import { adjustStock } from '@/lib/stock/mutations';
import { fetchProductById, fetchProductMovements } from '@/lib/stock/queries';
import { productCategoryLabel, type ProductStock, type StockMovement } from '@/lib/stock/types';

const CAUSE: Record<string, string> = {
  receive: 'Received',
  sale: 'Sale',
  adjustment: 'Adjustment',
  write_off: 'Write-off',
  internal_use: 'Internal use',
  return: 'Return',
};

export default function ProductMovementsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<ProductStock | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [qty, setQty] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!id) return;
    void Promise.all([fetchProductById(id), fetchProductMovements(id)]).then(([p, m]) => {
      setProduct(p);
      setMovements(m);
    });
  }, [id]);

  if (!product) {
    return (
      <ScreenContainer>
        <PageHeader title="Stock" />
        <Typography variant="bodyMuted" className="px-6">
          Loading…
        </Typography>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow={product.sku} title={product.name} />
      <View className="gap-4 px-6 pb-12">
        <Typography variant="bodyMuted">
          {productCategoryLabel(product.category)} · {product.qty_on_hand} on hand · reorder at{' '}
          {product.reorder_level}
        </Typography>
        <Button label="Receive stock" onPress={() => router.push('/(admin)/stock/receive' as never)} />
        <Card className="gap-2 p-4">
          <Typography variant="caption">Adjust (+ in, − out)</Typography>
          <TextInput
            value={qty}
            onChangeText={setQty}
            keyboardType="numbers-and-punctuation"
            placeholderTextColor={Colors.silver}
            className="rounded-lg border border-gold/20 bg-background px-3 py-2 text-ink"
          />
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Reason"
            placeholderTextColor={Colors.silver}
            className="rounded-lg border border-gold/20 bg-background px-3 py-2 text-ink"
          />
          <Button
            label="Post adjustment"
            variant="outline"
            onPress={async () => {
              const res = await adjustStock({
                productId: product.id,
                quantity: Number(qty),
                reason,
              });
              if (res.negative) {
                Alert.alert('Would go below zero', res.error ?? 'Tick an override on the website if that is real.');
                return;
              }
              if (res.error) {
                Alert.alert('Could not adjust', res.error);
                return;
              }
              const [p, m] = await Promise.all([
                fetchProductById(product.id),
                fetchProductMovements(product.id),
              ]);
              setProduct(p);
              setMovements(m);
              setQty('');
              setReason('');
            }}
          />
        </Card>
        {movements.map((m) => (
          <Card key={m.id} className="p-4">
            <Typography variant="subtitle">
              {m.quantity > 0 ? '+' : ''}
              {m.quantity} · {CAUSE[m.movement_type] ?? m.movement_type}
            </Typography>
            <Typography variant="caption" className="text-silver">
              {formatDate(m.occurred_at)} · {m.reason || '—'}
              {m.unit_cost != null ? ` · ${formatAmount(m.unit_cost)}` : ''}
            </Typography>
          </Card>
        ))}
      </View>
    </ScreenContainer>
  );
}
