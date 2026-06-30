import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, ScrollView, View } from 'react-native';

import { DogStatusBadge } from '@/components/dogs/DogStatusBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useDog } from '@/hooks/useDogs';
import { formatDogAge, formatKennelDate } from '@/lib/kennel/formatters';

const TABS = ['Profile', 'Health', 'Training', 'Litter', 'Documents', 'Gallery'] as const;

export default function DogProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { dog, loading, error } = useDog(id ?? '');
  const [tab, setTab] = useState<typeof TABS[number]>('Profile');

  if (loading) return <ScreenContainer><CardListSkeleton count={3} /></ScreenContainer>;
  if (error) {
    return (
      <ScreenContainer className="items-center justify-center px-6">
        <Typography variant="subtitle" className="text-danger">{error}</Typography>
        <Button label="Go back" variant="outline" onPress={() => router.back()} className="mt-4" />
      </ScreenContainer>
    );
  }
  if (!dog) {
    return (
      <ScreenContainer>
        <PageHeader title="Dog not found" back />
        <Typography variant="body" className="px-6">This dog could not be loaded.</Typography>
      </ScreenContainer>
    );
  }

  const photo = dog.media?.find((m) => m.is_primary)?.url ?? dog.media?.[0]?.url;

  return (
    <ScreenContainer>
      <PageHeader title={dog.name} back />
      <ScrollView className="px-6 pb-12">
        {photo ? (
          <Image source={{ uri: photo }} style={{ width: '100%', height: 220, borderRadius: 12 }} contentFit="cover" />
        ) : null}
        <View className="mt-3 flex-row flex-wrap gap-2">
          {TABS.map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              className={`rounded-full px-3 py-1 border ${tab === t ? 'border-gold bg-gold/20' : 'border-gold/30'}`}
            >
              <Typography variant="caption">{t}</Typography>
            </Pressable>
          ))}
        </View>

        {tab === 'Profile' ? (
          <Card className="mt-4">
            <DogStatusBadge status={dog.status} />
            <Typography variant="body" className="mt-3">DOB: {formatKennelDate(dog.date_of_birth)}</Typography>
            <Typography variant="body">Age: {formatDogAge(dog.date_of_birth)}</Typography>
            <Typography variant="body">Sex: {dog.sex ?? '—'}</Typography>
            <Typography variant="body">Colour: {dog.colour ?? '—'}</Typography>
            <Typography variant="body">Microchip: {dog.microchip_number ?? '—'}</Typography>
            {dog.description ? (
              <Typography variant="caption" className="mt-3 text-subtle">{dog.description}</Typography>
            ) : null}
            <Pressable onPress={() => router.push(`/(admin)/dogs/${dog.id}/edit` as never)} className="mt-4">
              <Typography variant="label" className="text-gold">Edit dog →</Typography>
            </Pressable>
          </Card>
        ) : null}

        {tab === 'Health' ? (
          <Card className="mt-4">
            <Typography variant="caption" className="text-subtle">
              Open the Health module for vaccinations and vet visits for this dog.
            </Typography>
            <Pressable onPress={() => router.push('/(tabs)/health/vaccinations/index' as never)} className="mt-3">
              <Typography variant="label" className="text-gold">View vaccinations →</Typography>
            </Pressable>
          </Card>
        ) : null}

        {tab === 'Training' ? (
          <Card className="mt-4">
            <Typography variant="body">{dog.training_notes ?? 'No training notes yet.'}</Typography>
          </Card>
        ) : null}

        {tab === 'Gallery' ? (
          <View className="mt-4 flex-row flex-wrap gap-2">
            {(dog.media ?? []).map((m) => (
              <Image key={m.id} source={{ uri: m.url }} style={{ width: 100, height: 100, borderRadius: 8 }} />
            ))}
          </View>
        ) : null}

        {tab === 'Documents' ? (
          <Card className="mt-4">
            <Pressable onPress={() => router.push('/(tabs)/documents/index' as never)}>
              <Typography variant="label" className="text-gold">Browse documents library →</Typography>
            </Pressable>
          </Card>
        ) : null}
      </ScrollView>
    </ScreenContainer>
  );
}
