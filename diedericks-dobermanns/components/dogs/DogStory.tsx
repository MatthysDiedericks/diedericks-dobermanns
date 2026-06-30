import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Linking, Pressable, View } from 'react-native';

import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { titleCase } from '@/lib/format';
import type { TimelineCategory, TimelineEntry } from '@/types/app.types';

const CATEGORY_TONE: Record<TimelineCategory, BadgeTone> = {
  training: 'gold',
  milestone: 'success',
  health: 'neutral',
  client_update: 'muted',
  general: 'neutral',
};

function EntryCard({ entry, onDelete }: { entry: TimelineEntry; onDelete?: (id: string) => void }) {
  return (
    <View className="flex-row">
      {/* Timeline rail */}
      <View className="mr-3 items-center">
        <View className="h-3 w-3 rounded-full bg-gold" />
        <View className="mt-1 w-px flex-1 bg-gold/20" />
      </View>

      <View className="flex-1 pb-6">
        <View className="flex-row items-center gap-2">
          <Typography variant="caption" className="text-silver">
            {new Date(entry.entry_date).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </Typography>
          <Badge label={titleCase(entry.category)} tone={CATEGORY_TONE[entry.category]} />
          {entry.source === 'client' ? <Badge label="Owner" tone="muted" /> : null}
        </View>

        <Typography variant="subtitle" className="mt-1">
          {entry.title}
        </Typography>
        {entry.notes ? (
          <Typography variant="bodyMuted" className="mt-1">
            {entry.notes}
          </Typography>
        ) : null}

        {entry.photo_urls.length ? (
          <View className="mt-3 flex-row flex-wrap gap-2">
            {entry.photo_urls.map((uri) => (
              <View key={uri} className="h-28 w-28 overflow-hidden rounded-xl bg-surface">
                <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              </View>
            ))}
          </View>
        ) : null}

        {entry.video_url ? (
          <Pressable
            onPress={() => entry.video_url && Linking.openURL(entry.video_url)}
            className="mt-3 flex-row items-center gap-2 self-start rounded-xl border border-gold/30 bg-black-rich px-4 py-2.5"
          >
            <Ionicons name="play-circle" size={18} color={Colors.gold} />
            <Typography variant="caption" className="text-gold">
              Watch video
            </Typography>
          </Pressable>
        ) : null}

        {onDelete ? (
          <Pressable onPress={() => onDelete(entry.id)} hitSlop={8} className="mt-3 self-start">
            <Typography variant="caption" className="text-danger">
              Delete
            </Typography>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

interface DogStoryProps {
  entries: TimelineEntry[];
  /** When provided, renders a delete affordance per entry (admin use). */
  onDelete?: (id: string) => void;
}

/** Vertical story / timeline for a dog: photos, videos and milestones. */
export function DogStory({ entries, onDelete }: DogStoryProps) {
  if (entries.length === 0) return null;
  return (
    <View>
      {entries.map((entry) => (
        <EntryCard key={entry.id} entry={entry} onDelete={onDelete} />
      ))}
    </View>
  );
}
