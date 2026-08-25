import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { TrainingVideoPlayer, formatDuration } from '@/components/Training/TrainingVideoPlayer';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import {
  clientCanWatch,
  useClientBundles,
  useVideoById,
  useVideosByCategory,
  useWatchProgress,
} from '@/hooks/useTrainingVideos';
import { normalizeTier } from '@/lib/training/access';
import { useAuthStore } from '@/stores/authStore';

export default function VideoPlayerScreen() {
  const { videoId } = useLocalSearchParams<{ videoId: string }>();
  const router = useRouter();
  const isStaff = useAuthStore((s) => s.hasRole('admin', 'super_admin', 'trainer'));
  const { video, playbackUrl, loading } = useVideoById(videoId);
  const { purchasedBundleIds, ownsADog } = useClientBundles();
  const { videos: siblings } = useVideosByCategory(video?.category_id);
  const { progressMap } = useWatchProgress();

  if (loading) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center">
        <ActivityIndicator color={Colors.gold} />
      </ScreenContainer>
    );
  }

  if (!video) {
    return (
      <ScreenContainer>
        <PageHeader title="Video" />
        <Typography variant="body" className="px-6 text-danger">
          Video unavailable.
        </Typography>
      </ScreenContainer>
    );
  }

  const unlocked = clientCanWatch(video, purchasedBundleIds, ownsADog, isStaff);
  const lockedPaid = !unlocked && normalizeTier(video.access_tier) === 'paid';
  const resume = progressMap.get(video.id)?.watched_seconds ?? 0;
  const idx = siblings.findIndex((v) => v.id === video.id);
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;

  return (
    <ScreenContainer>
      <PageHeader eyebrow={video.category?.name ?? 'Training'} title={video.title} />
      <ScrollView className="px-6 pb-12">
        {unlocked && playbackUrl ? (
          <TrainingVideoPlayer videoId={video.id} src={playbackUrl} startSeconds={resume} />
        ) : (
          <View className="aspect-video items-center justify-center rounded-xl border border-gold/30 bg-surface px-6">
            <Typography variant="body" className="text-center text-gold">
              {lockedPaid
                ? `Part of the ${video.bundle?.name ?? 'training'} bundle`
                : 'Access denied'}
            </Typography>
          </View>
        )}
        <View className="mt-4 flex-row flex-wrap items-center gap-2">
          <Badge label={video.category?.name ?? 'Training'} tone="neutral" />
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
              className="min-h-[44px] justify-center"
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
