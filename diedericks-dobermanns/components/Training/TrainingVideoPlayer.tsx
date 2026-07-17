import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { saveWatchProgress } from '@/hooks/useTrainingVideos';
import type { TrainingVideo } from '@/hooks/useTrainingVideos';

interface Props {
  video: TrainingVideo;
}

export function TrainingVideoPlayer({ video }: Props) {
  const lastSavedRef = useRef(0);

  // The player must be created unconditionally (rules of hooks) even when
  // there's no video_url yet — pass null so expo-video treats it as
  // "no source loaded" rather than attempting to fetch anything. The
  // <VideoView> below is only ever rendered once a real URL exists.
  const player = useVideoPlayer(video.video_url ?? null, (p) => {
    p.loop = false;
  });

  useEffect(() => {
    if (!video.video_url) return;

    const timeUpdateSub = player.addListener('timeUpdate', ({ currentTime }) => {
      const seconds = Math.round(currentTime);
      if (seconds - lastSavedRef.current >= 10) {
        lastSavedRef.current = seconds;
        void saveWatchProgress(video.id, seconds, false);
      }
    });

    const endSub = player.addListener('playToEnd', () => {
      const seconds = Math.round(player.currentTime);
      lastSavedRef.current = seconds;
      void saveWatchProgress(video.id, seconds, true);
    });

    return () => {
      timeUpdateSub.remove();
      endSub.remove();
      // Save final position on unmount (e.g. navigating away mid-video).
      const seconds = Math.round(player.currentTime);
      const finished = player.duration > 0 && player.currentTime >= player.duration - 0.5;
      void saveWatchProgress(video.id, seconds, finished);
    };
  }, [player, video.id, video.video_url]);

  if (!video.video_url) {
    return (
      <View className="aspect-video items-center justify-center rounded-xl border border-gold/30 bg-surface">
        <Ionicons name="play-circle" size={48} color={Colors.gold} />
        <Typography variant="caption" className="mt-2 text-gold">
          Video coming soon
        </Typography>
        <Typography variant="caption" className="mt-1 px-6 text-center text-silver">
          This video is being produced by our training team
        </Typography>
      </View>
    );
  }

  return (
    <VideoView
      player={player}
      nativeControls
      contentFit="contain"
      style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 12, backgroundColor: Colors.surface }}
    />
  );
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export { formatDuration };
