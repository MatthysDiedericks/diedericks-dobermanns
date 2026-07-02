import { Linking, Pressable, View } from 'react-native';

import { EntryCard } from '@/components/waitlist/EntryCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { markWaitlistContacted } from '@/lib/waitlist/mutations';
import { stageLabel } from '@/lib/waitlist/constants';
import { entryDisplayName, entryPhone, effectiveStage } from '@/lib/waitlist/helpers';
import { useSubmitting } from '@/hooks/useMutations';
import type { FollowUpGroup } from '@/hooks/useFollowUps';
import type { WaitingListEntry } from '@/types/app.types';

const GROUP_LABELS: Record<FollowUpGroup, string> = {
  overdue: 'Overdue',
  today: 'Due Today',
  week: 'This Week',
  upcoming: 'Upcoming',
};

interface Props {
  grouped: Record<FollowUpGroup, WaitingListEntry[]>;
  onRefresh: () => void;
  onSelect: (entry: WaitingListEntry) => void;
}

export function FollowUpList({ grouped, onRefresh, onSelect }: Props) {
  const { submitting, run } = useSubmitting();

  async function markContacted(id: string) {
    await run(() => markWaitlistContacted(id));
    onRefresh();
  }

  return (
    <View className="px-4 pb-8">
      {(['overdue', 'today', 'week'] as FollowUpGroup[]).map((group) => {
        const items = grouped[group];
        if (!items.length) return null;
        const tone = group === 'overdue' ? 'text-danger' : group === 'today' ? 'text-gold' : 'text-ink';
        return (
          <View key={group} className="mb-6">
            <Typography variant="label" className={`mb-2 ${tone}`}>
              {GROUP_LABELS[group]} ({items.length})
            </Typography>
            {items.map((entry) => (
              <View key={entry.id} className="mb-3">
                <EntryCard entry={entry} onPress={() => onSelect(entry)} />
                <View className="mt-1 flex-row gap-2 px-1">
                  <Badge label={stageLabel(effectiveStage(entry))} tone="muted" />
                  <Typography variant="caption" className="text-silver">
                    Last: {entry.last_contact_date ?? '—'}
                  </Typography>
                </View>
                <View className="mt-2 flex-row gap-2">
                  <Button
                    label="Mark contacted"
                    size="sm"
                    variant="outline"
                    loading={submitting}
                    onPress={() => void markContacted(entry.id)}
                  />
                  {entryPhone(entry) ? (
                    <Pressable onPress={() => Linking.openURL(`tel:${entryPhone(entry)}`)} className="px-3 py-2">
                      <Typography variant="caption" className="text-gold">
                        Call {entryDisplayName(entry)}
                      </Typography>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
}
