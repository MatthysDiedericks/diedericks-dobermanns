import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import {
  isWaitlistHoldExpired,
  isWaitlistOnHold,
  waitlistHoldChipLabel,
  waitlistHoldExpiredChipLabel,
} from '@/lib/waitlist/hold';

/** Amber hold note. The reason is on the row, not behind a tooltip. */
export function WaitlistHoldNote({
  holdUntil,
  holdReason,
}: {
  holdUntil?: string | null;
  holdReason?: string | null;
}) {
  const active = isWaitlistOnHold(holdUntil);
  const expired = isWaitlistHoldExpired(holdUntil);
  if (!active && !expired) return null;
  const chip =
    active && holdUntil
      ? waitlistHoldChipLabel(holdUntil)
      : expired && holdUntil
        ? waitlistHoldExpiredChipLabel(holdUntil)
        : null;
  return (
    <View className="mt-2 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2">
      {chip ? (
        <Typography variant="caption" className="text-amber-200">
          {chip}
        </Typography>
      ) : null}
      {holdReason?.trim() ? (
        <Typography variant="caption" className="mt-1 text-amber-100">
          {holdReason.trim()}
        </Typography>
      ) : null}
    </View>
  );
}
