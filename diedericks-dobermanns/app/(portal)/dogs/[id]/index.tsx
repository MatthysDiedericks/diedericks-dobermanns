import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import { DogDetailTabs } from '@/components/dogs/detail/DogDetailTabs';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { Typography } from '@/components/ui/Typography';
import { useDog } from '@/hooks/useDogs';

export default function PortalDogProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const dogId = id ?? '';
  const { dog, loading, error, refresh } = useDog(dogId);

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
      <PageHeader eyebrow="Your dog" title={dog.name} />
      <DogDetailTabs dogId={dogId} dog={dog} onRefresh={refresh} clientView />
    </ScreenContainer>
  );
}
