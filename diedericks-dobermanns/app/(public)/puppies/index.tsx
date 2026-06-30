import { View } from 'react-native';

import { DogCard } from '@/components/dogs/DogCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { useDogs } from '@/hooks/useDogs';

export default function PuppiesScreen() {
  const { dogs, loading } = useDogs({ category: 'puppy' });

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Next Generation" title="Puppies" back={false} />
      <View className="gap-4 px-6">
        {!loading && dogs.length === 0 ? (
          <EmptyState
            title="No puppies available right now"
            message="Join the waiting list via an application to be first in line for the next litter."
          />
        ) : (
          dogs.map((dog) => <DogCard key={dog.id} dog={dog} />)
        )}
      </View>
    </ScreenContainer>
  );
}
