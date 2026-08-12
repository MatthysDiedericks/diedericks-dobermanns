import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import type { DeliveryRate } from '@/lib/finance/deliveryRates';

import { LineItemRow, type DraftLineItem } from './LineItemRow';

export function LineItemList({
  items,
  onUpdate,
  onRemove,
  onAdd,
  deliveryRates = [],
}: {
  items: DraftLineItem[];
  onUpdate: (key: string, patch: Partial<DraftLineItem>) => void;
  onRemove: (key: string) => void;
  onAdd: () => void;
  deliveryRates?: DeliveryRate[];
}) {
  return (
    <>
      <Typography variant="label" className="mb-2 text-silver">Line items</Typography>
      <View className="gap-3">
        {items.map((it, idx) => (
          <LineItemRow
            key={it.key}
            item={it}
            index={idx}
            canRemove={items.length > 1}
            onUpdate={onUpdate}
            onRemove={onRemove}
            deliveryRates={deliveryRates}
          />
        ))}
      </View>
      <View className="mt-3 flex-row gap-2">
        <Button label="+ Add item" variant="outline" onPress={onAdd} />
      </View>
    </>
  );
}
