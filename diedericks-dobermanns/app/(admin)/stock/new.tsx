import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { createProduct } from '@/lib/stock/mutations';
import {
  PRODUCT_CATEGORIES,
  PRODUCT_UNITS,
  type ProductCategory,
  type ProductUnit,
} from '@/lib/stock/types';
import { Pressable, TextInput } from 'react-native';

export default function NewProductScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('other');
  const [unit, setUnit] = useState<ProductUnit>('each');
  const [cost, setCost] = useState('');
  const [sell, setSell] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Stock" title="New product" />
      <View className="gap-3 px-6 pb-10">
        <Typography variant="caption">Name</Typography>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholderTextColor={Colors.silver}
          className="rounded-lg border border-gold/20 bg-background px-3 py-2 text-ink"
        />
        <Typography variant="caption">Category</Typography>
        <View className="flex-row flex-wrap gap-2">
          {PRODUCT_CATEGORIES.map((c) => (
            <Pressable key={c.value} onPress={() => setCategory(c.value)}>
              <Typography className={category === c.value ? 'text-gold' : ''}>{c.label}</Typography>
            </Pressable>
          ))}
        </View>
        <Typography variant="caption">Unit</Typography>
        <View className="flex-row flex-wrap gap-2">
          {PRODUCT_UNITS.map((u) => (
            <Pressable key={u.value} onPress={() => setUnit(u.value)}>
              <Typography className={unit === u.value ? 'text-gold' : ''}>{u.label}</Typography>
            </Pressable>
          ))}
        </View>
        <Typography variant="caption">Cost / sell</Typography>
        <TextInput
          value={cost}
          onChangeText={setCost}
          keyboardType="decimal-pad"
          placeholder="Cost"
          placeholderTextColor={Colors.silver}
          className="rounded-lg border border-gold/20 bg-background px-3 py-2 text-ink"
        />
        <TextInput
          value={sell}
          onChangeText={setSell}
          keyboardType="decimal-pad"
          placeholder="Sell"
          placeholderTextColor={Colors.silver}
          className="rounded-lg border border-gold/20 bg-background px-3 py-2 text-ink"
        />
        <Button
          label={busy ? 'Saving…' : 'Save'}
          onPress={async () => {
            setBusy(true);
            const res = await createProduct({
              name,
              category,
              unit,
              cost_price: Number(cost) || 0,
              sell_price: Number(sell) || 0,
            });
            setBusy(false);
            if (res.error) {
              Alert.alert('Could not save', res.error);
              return;
            }
            router.replace('/(admin)/stock' as never);
          }}
        />
      </View>
    </ScreenContainer>
  );
}
