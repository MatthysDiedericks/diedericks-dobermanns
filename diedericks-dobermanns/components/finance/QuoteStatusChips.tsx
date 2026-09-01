import { Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import type { QuoteStatus } from '@/types/app.types';

export const QUOTE_STATUS_FILTERS = [
  'all',
  'draft',
  'sent',
  'accepted',
  'declined',
  'expired',
  'cancelled',
] as const;

export type QuoteStatusFilter = (typeof QUOTE_STATUS_FILTERS)[number];

const LABELS: Record<QuoteStatusFilter, string> = {
  all: 'All',
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  declined: 'Declined',
  expired: 'Lapsed',
  cancelled: 'Cancelled',
};

export function QuoteStatusChips({
  value,
  onChange,
  counts,
}: {
  value: QuoteStatusFilter;
  onChange: (next: QuoteStatusFilter) => void;
  counts: Record<string, number>;
}) {
  return (
    <View className="mb-3 flex-row flex-wrap gap-2">
      {QUOTE_STATUS_FILTERS.map((f) => {
        const active = value === f;
        const n = f === 'all' ? counts.all ?? 0 : counts[f] ?? 0;
        return (
          <Pressable
            key={f}
            onPress={() => onChange(f)}
            className={`rounded-full border px-3 py-1.5 ${
              active ? 'border-gold bg-gold/15' : 'border-gold/30'
            }`}
          >
            <Typography variant="caption">
              {LABELS[f]} ({n})
            </Typography>
          </Pressable>
        );
      })}
    </View>
  );
}

export function countQuoteStatuses(quotes: { status: QuoteStatus }[]): Record<string, number> {
  const counts: Record<string, number> = { all: quotes.length };
  for (const q of quotes) {
    counts[q.status] = (counts[q.status] ?? 0) + 1;
  }
  return counts;
}
