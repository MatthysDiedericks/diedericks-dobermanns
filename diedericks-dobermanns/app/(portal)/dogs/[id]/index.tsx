import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import { DogDetailTabs } from '@/components/dogs/detail/DogDetailTabs';
import { DogLineageStrip } from '@/components/dogs/DogLineageStrip';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { Typography } from '@/components/ui/Typography';
import { useDog } from '@/hooks/useDogs';
import { useLineageStrip } from '@/hooks/useLineageStrip';
import { liveAgeFromDob } from '@/lib/dogs/liveAge';

export default function PortalDogProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const dogId = id ?? '';
  const { dog, loading, error, refresh } = useDog(dogId, { staff: true });
  const lineage = useLineageStrip(dogId);

  if (loading) {
    return (
      <ScreenContainer>
        <PageHeader title="Your dog" />
        <View className="px-6">
          <CardListSkeleton count={3} />
        </View>
      </ScreenContainer>
    );
  }

  if (error || !dog) {
    return (
      <ScreenContainer>
        <PageHeader title="Your dog" />
        <View className="gap-4 px-6">
          <Typography variant="body" className="text-danger">
            {error ?? 'Dog not found'}
          </Typography>
          <Button label="Back" onPress={() => router.back()} variant="outline" />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll={false}>
      <PageHeader eyebrow="Your dog" title={dog.call_name || dog.name} />
      <View className="px-6">
        <Typography variant="caption" className="mb-2 text-muted">
          {[liveAgeFromDob(dog.date_of_birth), dog.sex].filter(Boolean).join(' · ')}
        </Typography>
        {lineage.data ? (
          <DogLineageStrip
            data={{
              ...lineage.data,
              progeny: lineage.data.progeny.map((p) => ({ ...p, href: null })),
            }}
            dogHref={(id) => `/(portal)/dogs/${id}`}
            pedigreeHref={`/(portal)/dogs/${dogId}`}
          />
        ) : null}
      </View>
      <DogDetailTabs
        dogId={dogId}
        dog={dog}
        onRefresh={refresh}
        clientView
        lineage={lineage.data}
      />
    </ScreenContainer>
  );
}
