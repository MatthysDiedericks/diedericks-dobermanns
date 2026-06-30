import { Image } from 'expo-image';
import { useState } from 'react';
import { Dimensions, ScrollView, View } from 'react-native';

import type { DogMedia } from '@/types/app.types';

const { width } = Dimensions.get('window');

interface DogGalleryProps {
  media: DogMedia[];
  height?: number;
}

/** Full-bleed swipeable photo gallery with paging dots. */
export function DogGallery({ media, height = 360 }: DogGalleryProps) {
  const [index, setIndex] = useState(0);
  const photos = media.filter((m) => m.type === 'photo');

  if (photos.length === 0) {
    return <View style={{ height }} className="w-full bg-surface" />;
  }

  return (
    <View style={{ height }} className="w-full">
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) =>
          setIndex(Math.round(e.nativeEvent.contentOffset.x / width))
        }
      >
        {photos.map((m) => (
          <Image
            key={m.id}
            source={{ uri: m.url }}
            style={{ width, height }}
            contentFit="cover"
            transition={300}
          />
        ))}
      </ScrollView>
      {photos.length > 1 ? (
        <View className="absolute bottom-4 w-full flex-row items-center justify-center gap-2">
          {photos.map((m, i) => (
            <View
              key={m.id}
              className={`h-1.5 rounded-full ${
                i === index ? 'w-6 bg-gold' : 'w-1.5 bg-ink/40'
              }`}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
