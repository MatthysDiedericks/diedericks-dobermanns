import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import {
  useCategoryVideoCounts,
  useVideoCategories,
  useWatchProgress,
  type TrainingVideo,
} from '@/hooks/useTrainingVideos';
import { formatDuration } from '@/lib/training/format';
import { requireSupabase } from '@/lib/supabase';

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  ribbon: 'ribbon-outline',
  shield: 'shield-outline',
  earth: 'earth-outline',
  school: 'school-outline',
  'play-circle': 'play-circle-outline',
};

function ContinueRow() {
  const router = useRouter();
  const { progressMap } = useWatchProgress();
  const [videos, setVideos] = useState<TrainingVideo[]>([]);

  useEffect(() => {
    const ids = [...progressMap.entries()]
      .filter(([, p]) => !p.completed && p.watched_seconds >= 3)
      .map(([id]) => id)
      .slice(0, 6);
    if (ids.length === 0) {
      setVideos([]);
      return;
    }
    void requireSupabase()
      .from('training_videos')
      .select('id, title, duration_seconds')
      .in('id', ids)
      .then(({ data }) => setVideos((data ?? []) as TrainingVideo[]));
  }, [progressMap]);

  const items = videos
    .map((v) => {
      const p = progressMap.get(v.id);
      if (!p) return null;
      return { video: v, watched: p.watched_seconds };
    })
    .filter((x): x is { video: TrainingVideo; watched: number } => x != null)
    .slice(0, 4);
  if (items.length === 0) return null;
  return (
    <View className="mb-6">
      <Typography variant="label" className="mb-3 text-gold">
        Continue watching
      </Typography>
      {items.map(({ video, watched }) => (
        <Pressable
          key={video.id}
          onPress={() =>
            router.push({
              pathname: '/(portal)/training/videos/play/[videoId]',
              params: { videoId: video.id },
            } as never)
          }
          className="mb-2 min-h-[56px]"
        >
          <Card>
            <Typography variant="body" numberOfLines={1}>
              {video.title}
            </Typography>
            <Typography variant="caption" className="text-silver">
              Resume at {formatDuration(watched)}
            </Typography>
          </Card>
        </Pressable>
      ))}
    </View>
  );
}

export default function TrainingVideoLibraryScreen() {
  const router = useRouter();
  const { categories, loading: catLoading } = useVideoCategories();
  const counts = useCategoryVideoCounts();

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Training" title="Training Library" />
      <ScrollView className="px-6 pb-12">
        <Typography variant="caption" className="mb-4 text-silver">
          Buyers get the full library with their puppy.
        </Typography>
        <ContinueRow />
        {catLoading ? (
          <ActivityIndicator color={Colors.gold} className="my-8" />
        ) : (
          <View className="mb-6 flex-row flex-wrap gap-3">
            {categories.map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() =>
                  router.push({
                    pathname: '/(portal)/training/videos/[categoryId]',
                    params: { categoryId: cat.id },
                  } as never)
                }
                style={{ width: '47%' }}
                className="min-h-[120px]"
              >
                <Card className="min-h-[120px] border-gold/25">
                  <Ionicons
                    name={ICON_MAP[cat.icon] ?? 'play-circle-outline'}
                    size={24}
                    color={cat.colour}
                  />
                  <Typography variant="subtitle" className="mt-2" numberOfLines={2}>
                    {cat.name}
                  </Typography>
                  <Typography variant="caption" className="mt-1 text-silver">
                    {counts[cat.id] ?? 0} videos
                  </Typography>
                </Card>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
