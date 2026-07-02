import { Ionicons } from '@expo/vector-icons';
import { Alert, Linking, Pressable, Share, View } from 'react-native';

import { PreferenceBadges } from '@/components/waitlist/PreferenceBadges';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { daysWaiting, isFollowUpOverdue, stageLabel } from '@/lib/waitlist/constants';
import { entryDisplayName, entryEmail, entryPhone, effectiveStage } from '@/lib/waitlist/helpers';
import { reorderWaitlistPosition } from '@/lib/waitlist/mutations';
import { formatPrice } from '@/lib/format';
import type { WaitingListEntry } from '@/types/app.types';

interface Props {
  entries: WaitingListEntry[];
  onSelect: (entry: WaitingListEntry) => void;
  onMoveStage: (entry: WaitingListEntry) => void;
  onRefresh: () => void;
}

export function WaitlistTable({ entries, onSelect, onMoveStage, onRefresh }: Props) {
  async function shiftPosition(entry: WaitingListEntry, dir: -1 | 1) {
    const idx = entries.findIndex((e) => e.id === entry.id);
    const swap = entries[idx + dir];
    if (!swap) return;
    const pos = entry.position ?? idx + 1;
    const swapPos = swap.position ?? idx + dir + 1;
    await reorderWaitlistPosition(entry.id, swapPos);
    await reorderWaitlistPosition(swap.id, pos);
    onRefresh();
  }

  return (
    <View className="px-4 pb-8">
      {entries.map((entry, idx) => {
        const overdue = isFollowUpOverdue(entry.follow_up_date);
        const paid = entry.payment_status === 'deposit_paid' || entry.payment_status === 'paid_in_full';
        return (
          <Card key={entry.id} className="mb-3 p-3">
            <View className="flex-row">
              <View className="mr-2 items-center">
                <Typography variant="caption" className="text-gold">
                  {entry.position ?? idx + 1}
                </Typography>
                <Pressable onPress={() => void shiftPosition(entry, -1)} className="p-1">
                  <Ionicons name="chevron-up" size={14} color={Colors.gold} />
                </Pressable>
                <Pressable onPress={() => void shiftPosition(entry, 1)} className="p-1">
                  <Ionicons name="chevron-down" size={14} color={Colors.gold} />
                </Pressable>
              </View>
              <View className="flex-1">
                <Pressable onPress={() => onSelect(entry)}>
                  <Typography variant="subtitle" className="text-gold">
                    {entryDisplayName(entry)}
                  </Typography>
                </Pressable>
                {entryPhone(entry) ? (
                  <Pressable onPress={() => Linking.openURL(`tel:${entryPhone(entry)}`)}>
                    <Typography variant="caption" className="text-gold">{entryPhone(entry)}</Typography>
                  </Pressable>
                ) : null}
                {entryEmail(entry) ? (
                  <Pressable onPress={() => Linking.openURL(`mailto:${entryEmail(entry)}`)}>
                    <Typography variant="caption" className="underline">{entryEmail(entry)}</Typography>
                  </Pressable>
                ) : null}
                <View className="mt-2">
                  <PreferenceBadges entry={entry} />
                </View>
                <View className="mt-2 flex-row flex-wrap gap-2">
                  <Badge label={stageLabel(effectiveStage(entry))} tone="gold" />
                  <Badge label={paid ? 'Paid' : 'Unpaid'} tone={paid ? 'success' : 'muted'} />
                  {entry.deposit_amount ? (
                    <Typography variant="caption" className="text-success">
                      {formatPrice(entry.deposit_amount)} ✓
                    </Typography>
                  ) : null}
                </View>
                <Typography variant="caption" className="mt-1 text-silver">
                  {daysWaiting(entry.created_at)}d · {entry.enquirer_country ?? '—'}
                </Typography>
                {entry.follow_up_date ? (
                  <Typography variant="caption" className={overdue ? 'text-danger' : 'text-silver'}>
                    Follow-up {entry.follow_up_date}
                  </Typography>
                ) : null}
                {entry.assigned_dog?.name ? (
                  <Typography variant="caption" className="text-gold">
                    Matched: {entry.assigned_dog.name}
                  </Typography>
                ) : (
                  <Typography variant="caption" className="text-silver">
                    Not yet matched
                  </Typography>
                )}
                <Typography variant="caption" numberOfLines={2} className="mt-1 text-silver">
                  {(entry.admin_notes ?? entry.preference_notes ?? '—').slice(0, 80)}
                </Typography>
              </View>
              <View className="justify-center gap-2">
                <Pressable onPress={() => onSelect(entry)}>
                  <Ionicons name="document-text-outline" size={20} color={Colors.gold} />
                </Pressable>
                <Pressable
                  onPress={() => {
                    const email = entryEmail(entry);
                    if (email) void Share.share({ message: email });
                    else Alert.alert('No email');
                  }}
                >
                  <Ionicons name="mail-outline" size={20} color={Colors.gold} />
                </Pressable>
                <Pressable onPress={() => onMoveStage(entry)}>
                  <Ionicons name="arrow-forward-circle-outline" size={20} color={Colors.gold} />
                </Pressable>
              </View>
            </View>
          </Card>
        );
      })}
    </View>
  );
}
