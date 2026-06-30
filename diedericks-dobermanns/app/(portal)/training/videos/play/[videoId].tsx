import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { TrainingVideoPlayer, formatDuration } from '@/components/Training/TrainingVideoPlayer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import {
  canWatchVideo,
  useClientBundles,
  useVideoById,
  useVideosByCategory,
} from '@/hooks/useTrainingVideos';
import { useAuthStore } from '@/stores/authStore';

export default function VideoPlayerScreen() {
  const { videoId } = useLocalSearchParams<{ videoId: string }>();
  const router = useRouter();
  const isAdmin = useAuthStore((s) => s.hasRole('admin'));
  const { video, loading } = useVideoById(videoId);
  const { purchasedBundleIds } = useClientBundles();
  const { videos: siblings } = useVideosByCategory(video?.category_id);

  if (loading) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center">
        <ActivityIndicator color={Colors.gold} />
      </ScreenContainer>
    );
  }

  if (!video || !canWatchVideo(video, purchasedBundleIds, isAdmin)) {
    return (
      <ScreenContainer>
        <PageHeader title="Video" />
        <Typography variant="body" className="px-6 text-danger">
          Video unavailable or access denied.
        </Typography>
      </ScreenContainer>
    );
  }

  const idx = siblings.findIndex((v) => v.id === video.id);
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;

  return (
    <ScreenContainer>
      <PageHeader eyebrow={video.category?.name ?? 'Training'} title={video.title} />

      <ScrollView className="px-6 pb-12">
        <TrainingVideoPlayer video={video} />

        <View className="mt-4 flex-row flex-wrap items-center gap-2">
          <Badge label={video.category?.name ?? 'Training'} tone="neutral" />
          <Badge label={video.access_tier === 'free' ? 'FREE' : 'BUNDLE'} tone="gold" />
          {video.week_label ? <Badge label={video.week_label} tone="neutral" /> : null}
          <Typography variant="caption" className="text-silver">
            {formatDuration(video.duration_seconds)}
          </Typography>
        </View>

        {video.description ? (
          <Typography variant="body" className="mt-4">
            {video.description}
          </Typography>
        ) : null}

        {(video.tags ?? []).length > 0 ? (
          <Typography variant="caption" className="mt-3 text-silver">
            Tags: {(video.tags ?? []).join(' · ')}
          </Typography>
        ) : null}

        {next ? (
          <View className="mt-8 border-t border-gold/20 pt-4">
            <Typography variant="label" className="mb-2 text-gold">
              Next in series
            </Typography>
            <Pressable
              onPress={() =>
                router.replace({
                  pathname: '/(portal)/training/videos/play/[videoId]',
                  params: { videoId: next.id },
                } as never)
              }
            >
              <Typography variant="body" className="text-gold">
                {next.title} →
              </Typography>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}
