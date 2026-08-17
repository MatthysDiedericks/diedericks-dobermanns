import { Ionicons } from '@expo/vector-icons';
import { Pressable, View, type TextInput } from 'react-native';

import { LastChargedHint } from '@/components/finance/LastChargedHint';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { formatPrice, titleCase } from '@/lib/format';
import type { LineItemInput } from '@/lib/finance/mutations';
import {
  HINT_ADD_DESCRIPTION,
  HINT_SET_PRICE,
  lineNeedsDescription,
  lineNeedsPrice,
} from '@/lib/finance/quoteOutstanding';
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
  priceSourceLabel?: string | null;
}

export function LineItemRow({
  item,
  index,
  canRemove,
  onUpdate,
  onRemove,
  bindDescription,
  bindPrice,
}: {
  item: DraftLineItem;
  index: number;
  canRemove: boolean;
  onUpdate: (key: string, patch: Partial<DraftLineItem>) => void;
  onRemove: (key: string) => void;
  bindDescription?: (key: string, el: TextInput | null) => void;
  bindPrice?: (key: string, el: TextInput | null) => void;
}) {
  const missingDesc = lineNeedsDescription(item);
  const missingPrice = lineNeedsPrice(item);

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

      <Typography variant="label" className="mb-2">
        Type
      </Typography>
      <View className="mb-3 flex-row flex-wrap gap-2">
        {ITEM_TYPES.map((t) => {
          const active = item.item_type === t;
          return (
            <Pressable
              key={t}
              onPress={() => onUpdate(item.key, { item_type: t })}
              className={`min-w-[5.5rem] rounded-lg border px-2.5 py-1.5 ${
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
        ref={(el) => bindDescription?.(item.key, el)}
        label="Description"
        value={item.description}
        onChangeText={(v) => onUpdate(item.key, { description: v.slice(0, 500) })}
        multiline
        textAlignVertical="top"
        className="min-h-[56px]"
        maxLength={500}
      />
      {missingDesc ? (
        <Typography variant="caption" className="-mt-3 mb-3 text-gold">
          {HINT_ADD_DESCRIPTION}
        </Typography>
      ) : null}

      <Input
        label="Qty"
        keyboardType="phone-pad"
        value={String(item.quantity)}
        onChangeText={(v) => onUpdate(item.key, { quantity: Math.max(Number(v) || 1, 1) })}
      />

      <Input
        ref={(el) => bindPrice?.(item.key, el)}
        label="Unit price (R)"
        keyboardType="phone-pad"
        value={item.unit_price ? String(item.unit_price) : ''}
        onChangeText={(v) => onUpdate(item.key, { unit_price: Number(v) || 0 })}
      />
      {missingPrice ? (
        <Typography variant="caption" className="-mt-3 mb-3 text-gold">
          {HINT_SET_PRICE}
        </Typography>
      ) : null}

      <LastChargedHint
        catalogueCode={item.catalogue_code}
        onPickAmount={(amount) => onUpdate(item.key, { unit_price: amount })}
      />
      {item.priceSourceLabel ? (
        <Typography variant="caption" className="mt-1 text-gold">
          {item.priceSourceLabel}
        </Typography>
      ) : null}

      <Typography variant="label" className="mt-3">
        Line total
      </Typography>
      <Typography variant="subtitle" className="mt-1 text-gold">
        {formatPrice(item.quantity * item.unit_price)}
      </Typography>
    </Card>
  );
}
