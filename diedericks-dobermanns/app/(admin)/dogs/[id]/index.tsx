import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { DogDetailTabs } from '@/components/dogs/detail/DogDetailTabs';
import { DogLineageStrip } from '@/components/dogs/DogLineageStrip';
import { DogRegisteredNameBlock } from '@/components/dogs/DogRegisteredNameBlock';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { Typography } from '@/components/ui/Typography';
import { useDog } from '@/hooks/useDogs';
import { useLineageStrip } from '@/hooks/useLineageStrip';
import { liveAgeFromDob } from '@/lib/dogs/liveAge';

export default function DogDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dogId = id ?? '';
  const { dog, loading, error, refresh } = useDog(dogId, { staff: true });
  const lineage = useLineageStrip(dogId);

  if (loading) {
    return (
      <ScreenContainer>
        <PageHeader title="Dog" />
        <View className="px-6">
          <CardListSkeleton count={3} />
        </View>
      </ScreenContainer>
    );
  }

  if (error || !dog) {
    return (
      <ScreenContainer>
        <PageHeader title="Dog" />
        <View className="gap-4 px-6">
          <Typography variant="body" className="text-danger">
            {error ?? 'Dog not found'}
          </Typography>
          <Button label="Try again" onPress={() => void refresh()} variant="outline" />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll={false}>
      <PageHeader
        eyebrow="Dog profile"
        title={dog.call_name ? `${dog.name} (${dog.call_name})` : dog.name}
      />
      <View className="px-6">
        <Typography variant="caption" className="mb-2 text-muted">
          {[liveAgeFromDob(dog.date_of_birth), dog.sex].filter(Boolean).join(' · ')}
        </Typography>
        <DogRegisteredNameBlock
          registeredName={dog.registered_name}
          wrightsCoi={dog.wrights_coi}
        />
        {lineage.data ? (
          <DogLineageStrip
            data={lineage.data}
            dogHref={(id) => `/(admin)/dogs/${id}`}
            litterHref={(id) => `/(admin)/litters/${id}`}
            pedigreeHref={`/(admin)/dogs/${dogId}/pedigree`}
          />
        ) : null}
      </View>
      <DogDetailTabs dogId={dogId} dog={dog} onRefresh={refresh} lineage={lineage.data} />
    </ScreenContainer>
  );
}
