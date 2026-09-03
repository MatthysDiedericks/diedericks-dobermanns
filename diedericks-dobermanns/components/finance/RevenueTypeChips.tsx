import { Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import {
  REVENUE_FILTER_LABELS,
  REVENUE_TYPE_FILTERS,
  type RevenueTypeFilter,
} from '@/lib/finance/quoteTypes';

export function RevenueTypeChips({
  value,
  onChange,
}: {
  value: RevenueTypeFilter;
  onChange: (next: RevenueTypeFilter) => void;
}) {
  return (
    <View className="mb-3 flex-row flex-wrap gap-2">
      {REVENUE_TYPE_FILTERS.map((f) => {
        const active = value === f;
        return (
          <Pressable
            key={f}
            onPress={() => onChange(f)}
            className={`rounded-full border px-3 py-1.5 ${
              active ? 'border-gold bg-gold/15' : 'border-gold/30'
            }`}
          >
            <Typography variant="caption">{REVENUE_FILTER_LABELS[f]}</Typography>
          </Pressable>
        );
      })}
    </View>
  );
}
