import { Pressable, View } from 'react-native';

import { PreferenceBadges } from '@/components/waitlist/PreferenceBadges';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { daysWaiting, isFollowUpOverdue } from '@/lib/waitlist/constants';
import { entryDisplayName, effectiveStage } from '@/lib/waitlist/helpers';
import type { WaitingListEntry } from '@/types/app.types';

const PRIORITY_DOT: Record<string, string> = {
  high: '🔴',
  normal: '⚪',
  low: '⬇',
};

interface Props {
  entry: WaitingListEntry;
  onPress: () => void;
  onLongPress?: () => void;
}

export function EntryCard({ entry, onPress, onLongPress }: Props) {
  const overdue = isFollowUpOverdue(entry.follow_up_date);
  const paid = entry.payment_status === 'deposit_paid' || entry.payment_status === 'paid_in_full';

  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} className="mb-2">
      <Card className="border-gold/15 p-3">
        <View className="flex-row items-start justify-between">
          <Typography variant="subtitle" className="flex-1 font-cinzel" numberOfLines={1}>
            {PRIORITY_DOT[entry.priority] ?? '⚪'} {entryDisplayName(entry)}
          </Typography>
          <Badge label={paid ? 'Deposit Paid' : 'Not Paid'} tone={paid ? 'success' : 'muted'} />
        </View>
        <View className="mt-2">
          <PreferenceBadges entry={entry} />
        </View>
        <View className="mt-2 flex-row flex-wrap items-center gap-2">
          <Typography variant="caption" className="text-silver">
            {daysWaiting(entry.created_at)} days
          </Typography>
          {entry.follow_up_date ? (
            <Typography variant="caption" className={overdue ? 'text-danger' : 'text-silver'}>
              Follow-up {entry.follow_up_date}
            </Typography>
          ) : null}
        </View>
        {effectiveStage(entry) === 'do_not_sell' ? (
          <Typography variant="caption" className="mt-1 text-danger">
            Do Not Sell
          </Typography>
        ) : null}
      </Card>
    </Pressable>
  );
}
