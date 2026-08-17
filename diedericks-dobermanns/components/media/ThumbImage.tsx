import { Image } from 'expo-image';
import { useState } from 'react';
import { PixelRatio, View, type StyleProp, type ImageStyle } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { supabaseThumbUrl, type ImageSizeKey } from '@/lib/thumbs';

function density(): 1 | 2 {
  return PixelRatio.get() >= 1.5 ? 2 : 1;
}

/** Grid tile: transformed URL, placeholder if the request fails. */
export function ThumbImage({
  uri,
  style,
  contentFit = 'cover',
  size = 'grid',
}: {
  uri: string | null | undefined;
  style?: StyleProp<ImageStyle>;
  contentFit?: 'cover' | 'contain';
  size?: ImageSizeKey;
}) {
  const [failed, setFailed] = useState(false);
  const src = supabaseThumbUrl(uri, size, density()) ?? uri ?? null;

  if (failed || !src) {
    return (
      <View className="h-full w-full items-center justify-center bg-surface">
        <Typography variant="caption" className="text-subtle">
          Photo unavailable
        </Typography>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: src }}
      style={style ?? { width: '100%', height: '100%' }}
      contentFit={contentFit}
      onError={() => setFailed(true)}
    />
  );
}
