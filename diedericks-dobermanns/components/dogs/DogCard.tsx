import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';

import { DogStatusBadge } from '@/components/dogs/DogStatusBadge';
import { ThumbImage } from '@/components/media/ThumbImage';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { titleCase } from '@/lib/format';
import { profilePhotoUrl } from '@/lib/dogs/profilePhoto';
import type { Dog } from '@/types/app.types';

interface DogCardProps {
  dog: Dog;
  variant?: 'default' | 'carousel';
}

export function DogCard({ dog, variant = 'default' }: DogCardProps) {
  const photo = profilePhotoUrl(dog.media);
  const subtitle = [titleCase(dog.sex), titleCase(dog.colour)].filter(Boolean).join(' · ');

  if (variant === 'carousel') {
    return (
      <Link href={`/(public)/dogs/${dog.id}`} asChild>
        <Pressable className="w-64">
          <View className="h-40 overflow-hidden rounded-2xl bg-surface">
            {photo ? (
              <ThumbImage uri={photo} />
            ) : null}
          </View>
          <Typography variant="subtitle" className="mt-3 text-gold">{dog.name}</Typography>
          {subtitle ? (
            <Typography variant="caption" className="text-subtle">{subtitle}</Typography>
          ) : null}
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
              <ThumbImage uri={photo} size="avatar" />
            ) : null}
          </View>
          <View className="ml-4 flex-1">
            <Typography variant="subtitle">{dog.name}</Typography>
            {subtitle ? (
              <Typography variant="caption" className="mt-0.5">
                {subtitle}
              </Typography>
            ) : null}
            <View className="mt-2">
              <DogStatusBadge status={dog.status} />
            </View>
          </View>
        </Card>
      </Pressable>
    </Link>
  );
}
