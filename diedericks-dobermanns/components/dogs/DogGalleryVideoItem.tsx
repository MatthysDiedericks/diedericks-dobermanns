import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import type { DogMedia } from '@/types/app.types';

interface Props {
  media: DogMedia;
}

/** A single video tile in the dog Gallery tab — thumbnail with play overlay, then inline playback. */
export function DogGalleryVideoItem({ media }: Props) {
  const [playing, setPlaying] = useState(false);

  const player = useVideoPlayer(media.url, (p) => {
    p.loop = false;
  });

  useEffect(() => {
    const sub = player.addListener('playToEnd', () => setPlaying(false));
    return () => sub.remove();
  }, [player]);

  useEffect(() => {
    if (playing) player.play();
    else player.pause();
  }, [playing, player]);

  if (playing) {
    return (
      <View className="w-full overflow-hidden rounded-xl border-2 border-gold" style={{ aspectRatio: 16 / 9 }}>
        <VideoView
          player={player}
          nativeControls
          contentFit="contain"
          style={{ width: '100%', height: '100%', backgroundColor: Colors.background }}
        />
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => setPlaying(true)}
      className="w-full overflow-hidden rounded-xl border-2 border-gold"
      style={{ aspectRatio: 16 / 9 }}
    >
      {media.thumbnail_url ? (
        <Image
          source={{ uri: media.thumbnail_url }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
        />
      ) : (
        <View className="h-full w-full items-center justify-center bg-surface" />
      )}
      <View className="absolute inset-0 items-center justify-center bg-black/30">
        <View className="h-14 w-14 items-center justify-center rounded-full bg-black/50 border-2 border-gold">
          <Ionicons name="play" size={26} color={Colors.gold} />
        </View>
      </View>
      {media.caption ? (
        <View className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
          <Typography variant="caption" className="text-text" numberOfLines={1}>
            {media.caption}
          </Typography>
        </View>
      ) : null}
    </Pressable>
  );
}
