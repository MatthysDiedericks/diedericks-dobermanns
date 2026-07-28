import { FlatList, ScrollView, View } from 'react-native';

import { EntryCard } from '@/components/waitlist/EntryCard';
import { Badge } from '@/components/ui/Badge';
import { Typography } from '@/components/ui/Typography';
import { KANBAN_STAGES, stageLabel, TERMINAL_STAGES } from '@/lib/waitlist/constants';
import { effectiveStage } from '@/lib/waitlist/helpers';
import type { WaitingListEntry } from '@/types/app.types';

interface Props {
  entries: WaitingListEntry[];
  onSelect: (entry: WaitingListEntry) => void;
  onLongPress?: (entry: WaitingListEntry) => void;
}

export function PipelineBoard({ entries, onSelect, onLongPress }: Props) {
  const grouped: Record<string, WaitingListEntry[]> = {};
  for (const stage of KANBAN_STAGES) grouped[stage] = [];
  for (const entry of entries) {
    const stage = effectiveStage(entry);
    if ((TERMINAL_STAGES as readonly string[]).includes(stage)) continue;
    if (grouped[stage]) grouped[stage].push(entry);
    else grouped.enquiry.push(entry);
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 pb-6">
      {KANBAN_STAGES.map((stage) => (
        <View key={stage} style={{ width: 260 }} className="mr-3">
          <View className="mb-2 flex-row items-center justify-between rounded-lg bg-surface px-3 py-2">
            <Typography variant="label">{stageLabel(stage)}</Typography>
            <Badge label={String(grouped[stage]?.length ?? 0)} tone="muted" />
          </View>
          <FlatList
            data={grouped[stage] ?? []}
            keyExtractor={(entry) => entry.id}
            style={{ maxHeight: 520 }}
            initialNumToRender={10}
            renderItem={({ item: entry }) => (
              <EntryCard
                entry={entry}
                onPress={() => onSelect(entry)}
                onLongPress={onLongPress ? () => onLongPress(entry) : undefined}
              />
            )}
          />
        </View>
      ))}
    </ScrollView>
  );
}
