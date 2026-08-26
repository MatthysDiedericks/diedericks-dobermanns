import { Image } from 'expo-image';
import { useState } from 'react';
import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { supabaseThumbUrl } from '@/lib/thumbs';
import type { DogMedia } from '@/types/app.types';

const SIZE = 112;

function primaryUrl(media: Pick<DogMedia, 'url' | 'is_primary'>[] | undefined): string | null {
  if (!media?.length) return null;
  const picked = media.find((m) => m.is_primary) ?? media[0];
  const url = picked?.url?.trim();
  return url || null;
}

function initialOf(name: string): string {
  const ch = name.trim().charAt(0);
  return ch ? ch.toUpperCase() : '?';
}

export function PortalDogThumb({
  name,
  media,
}: {
  name: string;
  media: Pick<DogMedia, 'url' | 'is_primary'>[] | undefined;
}) {
  const url = primaryUrl(media);
  const [failed, setFailed] = useState(false);
  const src = url ? (supabaseThumbUrl(url, 'avatar') ?? url) : null;
  const showImage = Boolean(src) && !failed;

  return (
    <View
      className="overflow-hidden rounded-xl border border-gold/40 bg-surface"
      style={{ width: SIZE, height: SIZE }}
    >
      {showImage && src ? (
        <Image
          source={{ uri: src }}
          style={{ width: SIZE, height: SIZE }}
          contentFit="cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <View
          className="items-center justify-center bg-surface"
          style={{ width: SIZE, height: SIZE }}
        >
          <Typography variant="title" className="text-gold">
            {initialOf(name)}
          </Typography>
        </View>
      )}
    </View>
  );
}
