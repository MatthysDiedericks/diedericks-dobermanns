import { View } from 'react-native';

import { DogCard } from '@/components/dogs/DogCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { DogGridSkeleton } from '@/components/ui/Skeleton';
import { Typography } from '@/components/ui/Typography';
import { useDogs } from '@/hooks/useDogs';

export default function BreedingStockScreen() {
  const { dogs, loading } = useDogs({ category: 'breeding_stock' });
  const sires = dogs.filter((d) => d.sex === 'male');
  const dams = dogs.filter((d) => d.sex === 'female');
  const unsexed = dogs.filter((d) => d.sex !== 'male' && d.sex !== 'female');

  return (
    <ScreenContainer>
      <PageHeader eyebrow="The Programme" title="Sires & Dams" />

      <View className="mb-8 px-6">
        <Typography variant="bodyMuted">
          The foundation of every Diedericks Dobermann. Health-tested, titled and
          temperament-proven — explore each dog&apos;s full pedigree.
        </Typography>
      </View>

      {loading ? (
        <DogGridSkeleton count={4} />
      ) : dogs.length === 0 ? (
        <View className="px-6">
          <EmptyState
            title="Breeding stock coming soon"
            message="Our sires and dams will be published here shortly."
          />
        </View>
      ) : (
        <View className="gap-8 px-6">
          {sires.length ? (
            <View>
              <SectionHeader eyebrow="Males" title="Our Sires" />
              <View className="gap-4">
                {sires.map((dog) => (
                  <DogCard key={dog.id} dog={dog} />
                ))}
              </View>
            </View>
          ) : null}

          {dams.length ? (
            <View>
              <SectionHeader eyebrow="Females" title="Our Dams" />
              <View className="gap-4">
                {dams.map((dog) => (
                  <DogCard key={dog.id} dog={dog} />
                ))}
              </View>
            </View>
          ) : null}

          {unsexed.length ? (
            <View className="gap-4">
              {unsexed.map((dog) => (
                <DogCard key={dog.id} dog={dog} />
              ))}
            </View>
          ) : null}
        </View>
      )}
    </ScreenContainer>
  );
}
