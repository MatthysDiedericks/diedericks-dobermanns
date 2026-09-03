import { Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import {
  REVENUE_TYPES,
  REVENUE_TYPE_LABELS,
  type RevenueType,
} from '@/lib/finance/quoteTypes';

export function QuoteTypeField({
  value,
  onChange,
}: {
  value: RevenueType;
  onChange: (next: RevenueType) => void;
}) {
  return (
    <View className="gap-2">
      <Typography variant="caption">Quote type</Typography>
      <View className="flex-row flex-wrap gap-2">
        {REVENUE_TYPES.map((t) => {
          const active = value === t;
          return (
            <Pressable
              key={t}
              onPress={() => onChange(t)}
              className={`rounded-full border px-3 py-1.5 ${
                active ? 'border-gold bg-gold/15' : 'border-gold/30'
              }`}
            >
              <Typography variant="caption">{REVENUE_TYPE_LABELS[t]}</Typography>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
