import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import type { DogMedia } from '@/types/app.types';

const HERO_HEIGHT = 280;
const THUMB_SIZE = 80;

interface PublicPhotoGalleryProps {
  media: DogMedia[];
}

function FullscreenViewer({
  viewer,
  width,
  onClose,
}: {
  viewer: DogMedia;
  width: number;
  onClose: () => void;
}) {
  const translateY = useSharedValue(0);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (e.translationY > 0) translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationY > 120) {
        runOnJS(onClose)();
        translateY.value = 0;
      } else {
        translateY.value = withSpring(0);
      }
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: 1 - Math.min(translateY.value / 300, 0.5),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View className="flex-1 items-center justify-center" style={style}>
        <Image
          source={{ uri: viewer.url }}
          style={{ width, height: width }}
          contentFit="contain"
        />
      </Animated.View>
    </GestureDetector>
  );
}

export function PublicPhotoGallery({ media }: PublicPhotoGalleryProps) {
  const photos = useMemo(
    () =>
      [...media]
        .filter((m) => m.type === 'photo')
        .sort((a, b) => a.sort_order - b.sort_order),
    [media],
  );
  const primary = photos.find((m) => m.is_primary) ?? photos[0] ?? null;
  const [viewer, setViewer] = useState<DogMedia | null>(null);
  const width = Dimensions.get('window').width;

  if (photos.length === 0) {
    return (
      <View
        style={{ height: HERO_HEIGHT }}
        className="w-full items-center justify-center bg-surface"
      >
        <Ionicons name="paw" size={64} color={Colors.gold} style={{ opacity: 0.35 }} />
      </View>
    );
  }

  return (
    <>
      <Pressable onPress={() => primary && setViewer(primary)}>
        <Image
          source={{ uri: primary?.url }}
          style={{ width: '100%', height: HERO_HEIGHT }}
          contentFit="cover"
          transition={300}
        />
      </Pressable>

      {photos.length > 1 ? (
        <FlatList
          horizontal
          data={photos}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
          renderItem={({ item }) => {
            const uri = item.thumbnail_url ?? item.url;
            const selected = item.id === primary?.id;
            return (
              <Pressable onPress={() => setViewer(item)}>
                <View
                  className={`overflow-hidden rounded-lg border-2 ${
                    selected ? 'border-gold' : 'border-transparent'
                  }`}
                >
                  <Image
                    source={{ uri }}
                    style={{ width: THUMB_SIZE, height: THUMB_SIZE }}
                    contentFit="cover"
                  />
                </View>
              </Pressable>
            );
          }}
        />
      ) : null}

      <Modal visible={viewer != null} transparent animationType="fade">
        <Pressable className="flex-1 bg-black/95" onPress={() => setViewer(null)}>
          {viewer ? (
            <FullscreenViewer viewer={viewer} width={width} onClose={() => setViewer(null)} />
          ) : null}
          <Pressable onPress={() => setViewer(null)} className="absolute right-6 top-14">
            <Ionicons name="close" size={28} color={Colors.gold} />
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
