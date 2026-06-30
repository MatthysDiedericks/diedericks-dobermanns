import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { DogDetailTabs } from '@/components/dogs/detail/DogDetailTabs';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { Typography } from '@/components/ui/Typography';
import { useDog } from '@/hooks/useDogs';

export default function DogDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dogId = id ?? '';
  const { dog, loading, error, refresh } = useDog(dogId);

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
      <DogDetailTabs dogId={dogId} dog={dog} onRefresh={refresh} />
    </ScreenContainer>
  );
}
