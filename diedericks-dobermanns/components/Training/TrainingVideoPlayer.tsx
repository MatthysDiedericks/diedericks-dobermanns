import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { saveWatchProgress } from '@/hooks/useTrainingVideos';

interface Props {
  videoId: string;
  src: string | null;
  startSeconds?: number;
}

export function TrainingVideoPlayer({ videoId, src, startSeconds = 0 }: Props) {
  const lastSavedRef = useRef(0);
  const player = useVideoPlayer(src ?? null, (p) => {
    p.loop = false;
  });

  useEffect(() => {
    if (!src) return;
    if (startSeconds > 1) {
      try {
        player.currentTime = startSeconds;
      } catch {
        /* player not ready */
      }
    }
    const timeUpdateSub = player.addListener('timeUpdate', ({ currentTime }) => {
      const seconds = Math.round(currentTime);
      if (seconds - lastSavedRef.current >= 10) {
        lastSavedRef.current = seconds;
        void saveWatchProgress(videoId, seconds, false);
      }
    });
    const endSub = player.addListener('playToEnd', () => {
      const seconds = Math.round(player.currentTime);
      lastSavedRef.current = seconds;
      void saveWatchProgress(videoId, seconds, true);
    });
    return () => {
      timeUpdateSub.remove();
      endSub.remove();
      const seconds = Math.round(player.currentTime);
      const finished = player.duration > 0 && player.currentTime >= player.duration - 0.5;
      void saveWatchProgress(videoId, seconds, finished);
    };
  }, [player, videoId, src, startSeconds]);

  if (!src) {
    return (
      <View className="aspect-video items-center justify-center rounded-xl border border-gold/30 bg-surface">
        <Ionicons name="play-circle" size={48} color={Colors.gold} />
        <Typography variant="caption" className="mt-2 text-gold">
          Video coming soon
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
