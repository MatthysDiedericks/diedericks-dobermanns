import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Alert, Pressable, View } from 'react-native';

import { DogStatusBadge } from '@/components/dogs/DogStatusBadge';
import { Typography } from '@/components/ui/Typography';
import type { Dog } from '@/types/app.types';
import { formatDogAge } from '@/lib/kennel/formatters';

const COLLAR_HEX: Record<string, string> = {
  black: '#1a1a1a',
  red: '#dc2626',
  blue: '#2563eb',
  fawn: '#d2691e',
  green: '#16a34a',
  yellow: '#eab308',
  pink: '#ec4899',
  orange: '#f97316',
  purple: '#8b5cf6',
};

export function KennelDogCard({
  dog,
}: {
  dog: Dog & { collar_colour?: string | null };
}) {
  const router = useRouter();
  const photo = dog.media?.[0]?.url;
  const micro = dog.microchip_number;

  return (
    <Pressable
      onPress={() => router.push(`/(tabs)/dogs/${dog.id}` as never)}
      className="mb-3 flex-1 rounded-xl border border-gold/20 bg-surface p-3 mx-1"
      style={{ maxWidth: '48%' }}
    >
      <View className="h-28 rounded-lg bg-black-rich overflow-hidden mb-2">
        {photo ? (
          <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
        ) : null}
      </View>
      <Typography variant="subtitle" className="text-gold" numberOfLines={1}>{dog.name}</Typography>
      {dog.call_name ? (
        <View className="mt-1 self-start rounded-full bg-gold/20 px-2 py-0.5">
          <Typography variant="caption">{dog.call_name}</Typography>
        </View>
      ) : null}
      <Typography variant="caption" className="mt-1">
        {dog.sex === 'male' ? '♂' : dog.sex === 'female' ? '♀' : '—'} · {formatDogAge(dog.date_of_birth)}
      </Typography>
      {micro ? (
        <Pressable onPress={() => Alert.alert('Microchip', micro)}>
          <Typography variant="caption" className="text-subtle mt-1" numberOfLines={1}>
            {micro.slice(0, 8)}…
          </Typography>
        </Pressable>
      ) : null}
      {dog.collar_colour ? (
        <View
          className="mt-2 self-start rounded-full px-2 py-0.5"
          style={{ backgroundColor: COLLAR_HEX[dog.collar_colour.toLowerCase()] ?? '#444' }}
        >
          <Typography variant="caption">{dog.collar_colour}</Typography>
        </View>
      ) : null}
      <View className="mt-2">
        <DogStatusBadge status={dog.status} />
      </View>
    </Pressable>
  );
}
