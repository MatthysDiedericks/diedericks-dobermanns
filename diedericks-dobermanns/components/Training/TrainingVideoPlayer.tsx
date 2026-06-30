import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode, type AVPlaybackStatus } from 'expo-av';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { saveWatchProgress } from '@/hooks/useTrainingVideos';
import type { TrainingVideo } from '@/hooks/useTrainingVideos';

interface Props {
  video: TrainingVideo;
}

export function TrainingVideoPlayer({ video }: Props) {
  const videoRef = useRef<Video>(null);
  const lastSavedRef = useRef(0);

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    const seconds = Math.round(status.positionMillis / 1000);
    if (seconds - lastSavedRef.current >= 10 || status.didJustFinish) {
      lastSavedRef.current = seconds;
      void saveWatchProgress(video.id, seconds, status.didJustFinish ?? false);
    }
  };

  useEffect(() => {
    return () => {
      void videoRef.current?.getStatusAsync().then((s) => {
        if (s.isLoaded) {
          void saveWatchProgress(
            video.id,
            Math.round(s.positionMillis / 1000),
            s.didJustFinish ?? false,
          );
        }
      });
    };
  }, [video.id]);

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
    <Video
      ref={videoRef}
      source={{ uri: video.video_url }}
      useNativeControls
      resizeMode={ResizeMode.CONTAIN}
      onPlaybackStatusUpdate={onPlaybackStatusUpdate}
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
