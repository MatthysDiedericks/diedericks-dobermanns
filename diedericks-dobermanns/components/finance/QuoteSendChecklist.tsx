import { Pressable, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import {
  formatOutstandingSummary,
  type QuoteOutstandingItem,
} from '@/lib/finance/quoteOutstanding';

/** Gold strip listing what still has to be done before Send. Tap a row to focus it. */
export function QuoteSendChecklist({
  items,
  onSelect,
}: {
  items: QuoteOutstandingItem[];
  onSelect: (item: QuoteOutstandingItem) => void;
}) {
  if (!items.length) return null;
  return (
    <Card className="border border-gold/40 bg-gold/10 p-4">
      <Typography variant="body" className="text-gold">
        {formatOutstandingSummary(items)}
      </Typography>
      <View className="mt-2 gap-1">
        {items.map((it) => (
          <Pressable key={it.id} onPress={() => onSelect(it)} hitSlop={6}>
            <Typography variant="caption" className="text-gold underline">
              {it.phrase}
            </Typography>
          </Pressable>
        ))}
      </View>
    </Card>
  );
}
