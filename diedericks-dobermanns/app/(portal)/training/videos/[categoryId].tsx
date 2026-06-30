import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, FlatList, Pressable, View } from 'react-native';

import { formatDuration } from '@/components/Training/TrainingVideoPlayer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import {
  canWatchVideo,
  useClientBundles,
  useVideosByCategory,
  useWatchProgress,
} from '@/hooks/useTrainingVideos';
import { useAuthStore } from '@/stores/authStore';

export default function CategoryVideosScreen() {
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  const router = useRouter();
  const isAdmin = useAuthStore((s) => s.hasRole('admin'));
  const { videos, loading } = useVideosByCategory(categoryId);
  const { purchasedBundleIds } = useClientBundles();
  const { progressMap } = useWatchProgress();

  const category = videos[0]?.category;
  const isCurriculum = category?.name?.includes('Curriculum');

  const onVideoPress = (videoId: string) => {
    const video = videos.find((v) => v.id === videoId);
    if (!video) return;
    if (!canWatchVideo(video, purchasedBundleIds, isAdmin)) {
      Alert.alert(
        'Bundle required',
        `This video is part of the ${video.bundle?.name ?? 'training bundle'}. Contact us to unlock access.`,
      );
      return;
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
          data={videos}
          keyExtractor={(v) => v.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}
          renderItem={({ item }) => {
            const unlocked = canWatchVideo(item, purchasedBundleIds, isAdmin);
            const progress = progressMap.get(item.id);
            const pct =
              item.duration_seconds && progress
                ? Math.min(100, Math.round((progress.watched_seconds / item.duration_seconds) * 100))
                : 0;

            return (
              <Pressable onPress={() => onVideoPress(item.id)} className="mb-3">
                <Card className={`flex-row gap-3 ${!unlocked ? 'opacity-80' : ''}`}>
                  <View className="h-16 w-24 items-center justify-center rounded-lg bg-surface border border-gold/20">
                    <Ionicons name={unlocked ? 'play-circle' : 'lock-closed'} size={28} color={Colors.gold} />
                  </View>
                  <View className="flex-1">
                    {isCurriculum && item.week_label ? (
                      <Typography variant="caption" className="text-gold">
                        {item.week_label}
                      </Typography>
                    ) : null}
                    <Typography variant="body" numberOfLines={2}>
                      {item.title}
                    </Typography>
                    <View className="mt-1 flex-row items-center gap-2">
                      <Typography variant="caption" className="text-silver">
                        {formatDuration(item.duration_seconds)}
                      </Typography>
                      <Badge
                        label={item.access_tier === 'free' ? 'FREE' : unlocked ? '✓' : 'BUNDLE'}
                        tone={item.access_tier === 'free' ? 'gold' : 'neutral'}
                      />
                      {progress?.completed ? (
                        <Typography variant="caption" className="text-success">
                          ✓
                        </Typography>
                      ) : null}
                    </View>
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
