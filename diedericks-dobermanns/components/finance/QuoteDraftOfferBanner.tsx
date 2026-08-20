import { Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import type { UnsentDraftOffer } from '@/lib/finance/quoteDraftQueries';
import { formatPrice } from '@/lib/format';

function timeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'earlier';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function QuoteDraftOfferBanner({
  offer,
  onResume,
  onStartFresh,
}: {
  offer: UnsentDraftOffer;
  onResume: () => void;
  onStartFresh: () => void;
}) {
  return (
    <View className="rounded-sm border border-gold/40 bg-elevated px-4 py-3">
      <Typography variant="body">
        Unsent draft from {timeLabel(offer.updated_at)} — {offer.line_count}{' '}
        {offer.line_count === 1 ? 'line' : 'lines'}, {formatPrice(offer.total)}.
      </Typography>
      <View className="mt-2 flex-row gap-4">
        <Pressable onPress={onResume} accessibilityRole="button">
          <Typography variant="body" className="text-gold underline">
            Resume
          </Typography>
        </Pressable>
        <Pressable onPress={onStartFresh} accessibilityRole="button">
          <Typography variant="bodyMuted" className="underline">
            Start fresh
          </Typography>
        </Pressable>
      </View>
    </View>
  );
}
