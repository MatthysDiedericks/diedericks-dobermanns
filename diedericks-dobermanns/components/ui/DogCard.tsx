import { Pressable, View } from 'react-native';

import { ThumbImage } from '@/components/media/ThumbImage';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Typography } from '@/components/ui/Typography';
import { profilePhotoUrl } from '@/lib/dogs/profilePhoto';
import type { Dog } from '@/types/app.types';

interface Props {
  dog: Dog;
  onPress?: () => void;
}

export function DogCard({ dog, onPress }: Props) {
  const img = profilePhotoUrl(dog.media);

  return (
    <Pressable onPress={onPress} className="overflow-hidden rounded-2xl border border-gold/20 bg-surface">
      <View className="h-44 w-full bg-black-rich">
        {img ? (
          <ThumbImage uri={img} />
        ) : null}
        <View className="absolute inset-0 bg-black/40" />
        <View className="absolute bottom-0 left-0 right-0 p-3">
          <Typography variant="display" className="text-white">
            {dog.name}
          </Typography>
          <View className="mt-2">
            <StatusBadge status={dog.status ?? 'active'} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}
