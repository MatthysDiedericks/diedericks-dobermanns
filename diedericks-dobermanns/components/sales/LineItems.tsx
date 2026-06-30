import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { formatPrice, titleCase } from '@/lib/format';
import type { LineItem } from '@/types/app.types';

interface LineItemsProps {
  items: LineItem[];
  subtotal: number;
  discount: number;
  total: number;
}

/** Read-only itemised breakdown shared by quote and invoice detail screens. */
export function LineItems({ items, subtotal, discount, total }: LineItemsProps) {
  return (
    <View className="rounded-2xl border border-gold/15 bg-black-rich">
      {items.map((item, idx) => (
        <View
          key={item.id}
          className={`flex-row items-start justify-between px-4 py-3 ${
            idx > 0 ? 'border-t border-gold/10' : ''
          }`}
        >
          <View className="flex-1 pr-3">
            <Typography variant="body" numberOfLines={2}>
              {item.description}
            </Typography>
            <Typography variant="caption" className="mt-0.5">
              {titleCase(item.item_type)}
              {item.quantity > 1 ? ` · ${item.quantity} × ${formatPrice(item.unit_price)}` : ''}
            </Typography>
          </View>
          <Typography variant="body">{formatPrice(item.line_total)}</Typography>
        </View>
      ))}

      <View className="border-t border-gold/20 px-4 py-3">
        <View className="flex-row justify-between">
          <Typography variant="bodyMuted">Subtotal</Typography>
          <Typography variant="body">{formatPrice(subtotal)}</Typography>
        </View>
        {discount > 0 ? (
          <View className="mt-1 flex-row justify-between">
            <Typography variant="bodyMuted">Discount</Typography>
            <Typography variant="body">- {formatPrice(discount)}</Typography>
          </View>
        ) : null}
        <View className="mt-2 flex-row justify-between border-t border-gold/10 pt-2">
          <Typography variant="subtitle">Total</Typography>
          <Typography variant="subtitle" className="text-gold">
            {formatPrice(total)}
          </Typography>
        </View>
      </View>
    </View>
  );
}
