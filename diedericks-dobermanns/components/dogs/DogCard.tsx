import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';

import { DogStatusBadge } from '@/components/dogs/DogStatusBadge';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { formatPrice, titleCase } from '@/lib/format';
import type { Dog } from '@/types/app.types';

interface DogCardProps {
  dog: Dog;
  variant?: 'default' | 'carousel';
}

export function DogCard({ dog, variant = 'default' }: DogCardProps) {
  const photo = dog.media?.find((m) => m.is_primary)?.url ?? dog.media?.[0]?.url;

  if (variant === 'carousel') {
    return (
      <Link href={`/(public)/dogs/${dog.id}`} asChild>
        <Pressable className="w-64">
          <View className="h-40 overflow-hidden rounded-2xl bg-surface">
            {photo ? (
              <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : null}
          </View>
          <Typography variant="subtitle" className="mt-3 text-gold">{dog.name}</Typography>
          <Typography variant="caption" className="text-subtle">{formatPrice(dog.price)}</Typography>
        </Pressable>
      </Link>
    );
  }

  return (
    <Link href={`/(public)/dogs/${dog.id}`} asChild>
      <Pressable>
        <Card className="flex-row items-center">
          <View className="h-20 w-20 overflow-hidden rounded-xl bg-surface">
            {photo ? (
              <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : null}
          </View>
          <View className="ml-4 flex-1">
            <Typography variant="subtitle">{dog.name}</Typography>
            <Typography variant="caption" className="mt-0.5">
              {titleCase(dog.category ?? '')} · {formatPrice(dog.price)}
            </Typography>
            <View className="mt-2">
              <DogStatusBadge status={dog.status} />
            </View>
          </View>
        </Card>
      </Pressable>
    </Link>
  );
}
