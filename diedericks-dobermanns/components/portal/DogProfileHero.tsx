import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { PublicPhotoGallery } from '@/components/dogs/PublicPhotoGallery';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { ageFromDob, birthdayAgeWords, isBirthdayToday } from '@/lib/format';
import { formatKennelDate } from '@/lib/kennel/formatters';
import type { Dog } from '@/types/app.types';

interface DogProfileHeroProps {
  dog: Dog;
  nickname?: string | null;
}

export function DogProfileHero({ dog, nickname }: DogProfileHeroProps) {
  const router = useRouter();
  const displayName = nickname ? `${dog.name} (${nickname})` : dog.name;
  const showBirthday = isBirthdayToday(dog.date_of_birth);

  return (
    <View className="relative">
      <PublicPhotoGallery media={dog.media ?? []} />
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: 24,
          paddingVertical: 20,
          backgroundColor: 'rgba(17,16,8,0.88)',
        }}
      >
        <Typography variant="displayLg" className="text-gold">
          {displayName}
        </Typography>
        <View className="mt-2 flex-row flex-wrap gap-2">
          <View className="rounded-full border border-gold/40 bg-black-rich/80 px-3 py-1">
            <Typography variant="caption">{ageFromDob(dog.date_of_birth) ?? '—'}</Typography>
          </View>
          {dog.date_of_birth ? (
            <View className="rounded-full border border-gold/25 bg-black-rich/80 px-3 py-1">
              <Typography variant="caption">{formatKennelDate(dog.date_of_birth)}</Typography>
            </View>
          ) : null}
        </View>
      </View>
      <View className="px-6 pt-3">
        {showBirthday ? (
          <View className="mb-3 rounded-xl border border-gold bg-gold/15 px-4 py-3">
            <Typography variant="subtitle" className="text-gold">
              {dog.name} turns {birthdayAgeWords(dog.date_of_birth) ?? 'another year'} today
            </Typography>
          </View>
        ) : null}
        <Button
          label="+ ADD PHOTOS"
          variant="ghost"
          onPress={() =>
            router.push({ pathname: '/(portal)/add-photos/[dogId]', params: { dogId: dog.id } })
          }
        />
        <Button
          label="Request training"
          variant="outline"
          className="mt-2"
          onPress={() => router.push('/(portal)/training/request' as never)}
        />
      </View>
    </View>
  );
}
