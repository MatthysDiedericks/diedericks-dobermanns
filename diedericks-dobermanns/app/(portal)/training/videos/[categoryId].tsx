import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, FlatList, Pressable, View } from 'react-native';

import { formatDuration } from '@/components/Training/TrainingVideoPlayer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import {
  clientCanWatch,
  useClientBundles,
  useVideosByCategory,
  useWatchProgress,
} from '@/hooks/useTrainingVideos';
import { normalizeTier, videoHasFile } from '@/lib/training/access';
import { useAuthStore } from '@/stores/authStore';

export default function CategoryVideosScreen() {
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  const router = useRouter();
  const isStaff = useAuthStore((s) => s.hasRole('admin', 'super_admin', 'trainer'));
  const { videos, loading } = useVideosByCategory(categoryId);
  const { purchasedBundleIds, ownsADog } = useClientBundles();
  const { progressMap } = useWatchProgress();
  const category = videos[0]?.category;
  const playable = videos.filter((v) => videoHasFile(v.video_url) || isStaff);

  const onVideoPress = (videoId: string) => {
    const video = playable.find((v) => v.id === videoId);
    if (!video) return;
    if (!clientCanWatch(video, purchasedBundleIds, ownsADog, isStaff)) {
      Alert.alert(
        'Bundle required',
        `This video is part of the ${video.bundle?.name ?? 'training bundle'}.`,
      );
    }
    router.push({
      pathname: '/(portal)/training/videos/play/[videoId]',
      params: { videoId },
    } as never);
  };

  return (
    <ScreenContainer scroll={false}>
      <PageHeader eyebrow="Training Library" title={category?.name ?? 'Videos'} />
      {category?.description ? (
        <Typography variant="caption" className="mb-4 px-6 text-silver">
          {category.description}
        </Typography>
      ) : null}
      {loading ? (
        <ActivityIndicator color={Colors.gold} className="mt-8" />
      ) : (
        <FlatList
          data={playable}
          keyExtractor={(v) => v.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}
          renderItem={({ item }) => {
            const unlocked = clientCanWatch(item, purchasedBundleIds, ownsADog, isStaff);
            const progress = progressMap.get(item.id);
            const pct =
              item.duration_seconds && progress
                ? Math.min(100, Math.round((progress.watched_seconds / item.duration_seconds) * 100))
                : 0;
            const lockedPaid = !unlocked && normalizeTier(item.access_tier) === 'paid';
            return (
              <Pressable onPress={() => onVideoPress(item.id)} className="mb-3 min-h-[72px]">
                <Card className="flex-row gap-3">
                  <View className="h-16 w-24 items-center justify-center rounded-lg border border-gold/20 bg-surface">
                    <Ionicons
                      name={unlocked ? 'play-circle' : 'lock-closed'}
                      size={28}
                      color={Colors.gold}
                    />
                  </View>
                  <View className="flex-1">
                    {item.week_label ? (
                      <Typography variant="caption" className="text-gold">
                        {item.week_label}
                      </Typography>
                    ) : null}
                    <Typography variant="body" numberOfLines={2}>
                      {item.title}
                    </Typography>
                    <Typography variant="caption" className="mt-1 text-silver">
                      {formatDuration(item.duration_seconds)}
                      {lockedPaid ? ` · Part of the ${item.bundle?.name ?? 'bundle'}` : ''}
                    </Typography>
                    {pct > 0 && !progress?.completed ? (
                      <View className="mt-2 h-1 overflow-hidden rounded-full bg-surface">
                        <View className="h-full bg-gold" style={{ width: `${pct}%` }} />
                      </View>
                    ) : null}
                  </View>
                </Card>
              </Pressable>
            );
          }}
        />
      )}
    </ScreenContainer>
  );
}
