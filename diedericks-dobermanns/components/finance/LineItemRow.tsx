import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { formatPrice, titleCase } from '@/lib/format';
import type { LineItemInput } from '@/lib/finance/mutations';
import type { LineItemType } from '@/types/app.types';

const ITEM_TYPES: LineItemType[] = [
  'dog',
  'board_train',
  'training',
  'delivery',
  'transport',
  'accessory',
  'other',
];

export interface DraftLineItem extends LineItemInput {
  key: string;
}

export function LineItemRow({
  item,
  index,
  canRemove,
  onUpdate,
  onRemove,
}: {
  item: DraftLineItem;
  index: number;
  canRemove: boolean;
  onUpdate: (key: string, patch: Partial<DraftLineItem>) => void;
  onRemove: (key: string) => void;
}) {
  return (
    <Card>
      <View className="mb-2 flex-row items-center justify-between">
        <Typography variant="caption">Item {index + 1}</Typography>
        {canRemove ? (
          <Pressable onPress={() => onRemove(item.key)} hitSlop={8}>
            <Ionicons name="trash-outline" size={16} color={Colors.silver} />
          </Pressable>
        ) : null}
      </View>
      <View className="mb-3 flex-row flex-wrap gap-2">
        {ITEM_TYPES.map((t) => {
          const active = item.item_type === t;
          return (
            <Pressable
              key={t}
              onPress={() => onUpdate(item.key, { item_type: t })}
              className={`rounded-lg border px-2.5 py-1.5 ${
                active ? 'border-gold bg-gold/15' : 'border-gold/20 bg-surface'
              }`}
            >
              <Typography variant="caption" className={active ? 'text-gold' : 'text-ink-muted'}>
                {titleCase(t)}
              </Typography>
            </Pressable>
          );
        })}
      </View>
      <Input
        placeholder="Description"
        value={item.description}
        onChangeText={(v) => onUpdate(item.key, { description: v })}
      />
      <View className="flex-row gap-3">
        <Input
          containerClassName="mb-0 flex-1"
          label="Qty"
          keyboardType="phone-pad"
          value={String(item.quantity)}
          onChangeText={(v) => onUpdate(item.key, { quantity: Math.max(Number(v) || 1, 1) })}
        />
        <Input
          containerClassName="mb-0 flex-[2]"
          label="Unit price (ZAR)"
          keyboardType="phone-pad"
          value={item.unit_price ? String(item.unit_price) : ''}
          onChangeText={(v) => onUpdate(item.key, { unit_price: Number(v) || 0 })}
        />
      </View>
      <Typography variant="caption" className="mt-2 text-right">
        Line total: {formatPrice(item.quantity * item.unit_price)}
      </Typography>
    </Card>
  );
}
