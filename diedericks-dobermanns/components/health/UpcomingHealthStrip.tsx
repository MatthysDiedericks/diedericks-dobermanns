import { Image } from 'expo-image';
import { ScrollView, Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { EVENT_TYPE_LABELS } from '@/lib/health/constants';
import { urgencyColor } from '@/lib/health/dueStatus';
import type { UpcomingHealthEvent } from '@/lib/health/types';

interface UpcomingHealthStripProps {
  events: UpcomingHealthEvent[];
  onPressEvent: (event: UpcomingHealthEvent) => void;
}

export function UpcomingHealthStrip({ events, onPressEvent }: UpcomingHealthStripProps) {
  if (events.length === 0) return null;

  return (
    <View className="mb-4">
      <Typography variant="label" className="mb-2 px-6 text-gold">
        UPCOMING (30 DAYS)
      </Typography>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, gap: 12 }}
      >
        {events.map((e) => (
          <Pressable
            key={e.id}
            onPress={() => onPressEvent(e)}
            className="w-44 rounded-xl border border-gold/20 bg-surface p-3"
          >
            <View className="mb-2 flex-row items-center gap-2">
              <View className="h-8 w-8 overflow-hidden rounded-full bg-black-rich">
                {e.photoUrl ? (
                  <Image source={{ uri: e.photoUrl }} style={{ width: 32, height: 32 }} contentFit="cover" />
                ) : null}
              </View>
              <Typography variant="caption" numberOfLines={1} className="flex-1">
                {e.dogName}
              </Typography>
            </View>
            <Typography variant="caption" className="text-muted" style={{ fontSize: 10 }}>
              {EVENT_TYPE_LABELS[e.eventType] ?? e.eventType.toUpperCase()}
            </Typography>
            <Typography
              variant="caption"
              className="mt-1"
              style={{ color: urgencyColor(e.daysUntil) }}
            >
              {e.daysUntil < 0 ? `${Math.abs(e.daysUntil)} days overdue` : `Due in ${e.daysUntil} days`}
            </Typography>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}
