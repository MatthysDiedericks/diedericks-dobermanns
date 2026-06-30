import { Image } from 'expo-image';
import { useState } from 'react';
import { Dimensions, Pressable, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useGallery } from '@/hooks/useContent';
import type { GalleryCategory } from '@/types/app.types';

const { width } = Dimensions.get('window');
const GAP = 12;
const COL = (width - 24 * 2 - GAP) / 2;

const CATEGORIES: { key: GalleryCategory | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'puppies', label: 'Puppies' },
  { key: 'training', label: 'Training' },
  { key: 'competition', label: 'Competition' },
  { key: 'family', label: 'Family' },
  { key: 'kennel', label: 'Kennel' },
];

export default function GalleryScreen() {
  const { data: items } = useGallery();
  const [cat, setCat] = useState<GalleryCategory | 'all'>('all');

  const visible = items.filter((i) => cat === 'all' || i.category === cat);

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Moments" title="Gallery" back={false} />

      <View className="mb-6 flex-row flex-wrap gap-2 px-6">
        {CATEGORIES.map((c) => {
          const active = cat === c.key;
          return (
            <Pressable
              key={c.key}
              onPress={() => setCat(c.key)}
              className={`rounded-full border px-4 py-2 ${
                active ? 'border-gold bg-gold/15' : 'border-gold/20 bg-black-rich'
              }`}
            >
              <Typography variant="caption" className={active ? 'text-gold' : 'text-silver'}>
                {c.label}
              </Typography>
            </Pressable>
          );
        })}
      </View>

      <View className="flex-row flex-wrap px-6" style={{ gap: GAP }}>
        {visible.map((item) => (
          <View
            key={item.id}
            style={{ width: COL, height: COL }}
            className="overflow-hidden rounded-xl bg-surface"
          >
            <Image
              source={{ uri: item.image_url }}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
              transition={250}
            />
          </View>
        ))}
      </View>
    </ScreenContainer>
  );
}
