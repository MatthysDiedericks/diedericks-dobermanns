import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import type { DogMedia } from '@/types/app.types';

interface PhotoCardProps {
  item: DogMedia;
  index: number;
  size: number;
  onPress: () => void;
  onLongPress: () => void;
}

export function PhotoCard({ item, index, size, onPress, onLongPress }: PhotoCardProps) {
  const uri = item.thumbnail_url ?? item.url;

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={{ width: size, height: size, padding: 4 }}
    >
      <View className="relative h-full w-full overflow-hidden rounded-lg bg-surface">
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        {item.is_primary ? (
          <View className="absolute left-1 top-1 rounded-full bg-black/70 px-1.5 py-0.5">
            <Ionicons name="star" size={12} color={Colors.gold} />
          </View>
        ) : null}
        <View className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5">
          <Typography variant="caption" className="text-[10px] text-ink">
            {index + 1}
          </Typography>
        </View>
      </View>
    </Pressable>
  );
}
