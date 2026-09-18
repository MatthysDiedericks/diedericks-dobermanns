import { Image } from 'expo-image';
import { useState } from 'react';
import { Dimensions, Modal, Pressable, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useGallery } from '@/hooks/useContent';
import type { GalleryCategory, GalleryItem } from '@/types/app.types';

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
  const [active, setActive] = useState<GalleryItem | null>(null);

  const visible = items.filter((i) => cat === 'all' || i.category === cat);

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Moments" title="Gallery" back={false} />

      <View className="mb-6 flex-row flex-wrap gap-2 px-6">
        {CATEGORIES.map((c) => {
          const activeCat = cat === c.key;
          return (
            <Pressable
              key={c.key}
              onPress={() => setCat(c.key)}
              className={`rounded-full border px-4 py-2 ${
                activeCat ? 'border-gold bg-gold/15' : 'border-gold/20 bg-black-rich'
              }`}
            >
              <Typography variant="caption" className={activeCat ? 'text-gold' : 'text-silver'}>
                {c.label}
              </Typography>
            </Pressable>
          );
        })}
      </View>

      <View className="flex-row flex-wrap px-6" style={{ gap: GAP }}>
        {visible.map((item) => {
          const caption = item.description?.trim() || null;
          return (
            <Pressable key={item.id} onPress={() => setActive(item)} style={{ width: COL }}>
              <View style={{ width: COL, height: COL }} className="overflow-hidden rounded-xl bg-surface">
                {item.image_url ? (
                  <Image
                    source={{ uri: item.image_url }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    transition={250}
                  />
                ) : null}
              </View>
              {caption ? (
                <Typography variant="caption" numberOfLines={3} className="mt-1.5 text-silver">
                  {caption}
                </Typography>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <Modal visible={active != null} transparent animationType="fade" onRequestClose={() => setActive(null)}>
        <Pressable className="flex-1 justify-center bg-black/95 px-4" onPress={() => setActive(null)}>
          {active?.image_url ? (
            <Image
              source={{ uri: active.image_url }}
              style={{ width: width - 32, height: width - 32 }}
              contentFit="contain"
            />
          ) : null}
          {active?.description?.trim() ? (
            <Typography variant="body" className="mt-4 text-center text-ink">
              {active.description.trim()}
            </Typography>
          ) : null}
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}
