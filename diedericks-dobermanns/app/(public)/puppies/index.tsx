import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { DogCard } from '@/components/dogs/DogCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Typography } from '@/components/ui/Typography';
import { useLitters } from '@/hooks/useContent';
import { useDogs } from '@/hooks/useDogs';
import { titleCase } from '@/lib/format';

function formatExpected(value: string | null): string {
  if (!value) return 'Date to be confirmed';
  return new Date(value).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
}

export default function PuppiesScreen() {
  const router = useRouter();
  const { dogs: puppies, loading: puppiesLoading } = useDogs({ category: 'puppy' });
  const { data: litters, loading: littersLoading } = useLitters();

  // Only show litters that haven't been fully placed yet — this is the
  // "next due dates / forecasted litters" view, not a historical record.
  const upcomingLitters = litters.filter((l) => l.status !== 'placed');

  const loading = puppiesLoading || littersLoading;
  const nothingToShow = !loading && puppies.length === 0 && upcomingLitters.length === 0;

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Next Generation" title="Puppies" back={false} />

      {nothingToShow ? (
        <View className="px-6">
          <EmptyState
            title="No puppies available right now"
            message="Join the waiting list via an application to be first in line for the next litter."
          />
        </View>
      ) : (
        <>
          {puppies.length > 0 ? (
            <View className="gap-4 px-6">
              <SectionHeader eyebrow="On Hand" title="Available Puppies" />
              {puppies.map((dog) => (
                <DogCard key={dog.id} dog={dog} />
              ))}
            </View>
          ) : null}

          {upcomingLitters.length > 0 ? (
            <View className="mt-10 gap-4 px-6">
              <SectionHeader eyebrow="Planned Pairings" title="Expected Litters" />
              {upcomingLitters.map((litter) => (
                <Pressable key={litter.id} onPress={() => router.push(`/litters/${litter.id}`)}>
                  <Card>
                    <View className="flex-row items-center justify-between">
                      <Typography variant="title" className="flex-1">
                        {litter.name ?? 'Upcoming Litter'}
                      </Typography>
                      <Badge label={titleCase(litter.status ?? 'planned')} tone="gold" />
                    </View>
                    <Typography variant="caption" className="mt-2">
                      Due {formatExpected(litter.expected_date)}
                      {litter.available_count != null
                        ? ` · ${litter.available_count} spots open`
                        : ''}
                    </Typography>
                    {litter.description ? (
                      <Typography variant="bodyMuted" className="mt-3">
                        {litter.description}
                      </Typography>
                    ) : null}
                  </Card>
                </Pressable>
              ))}
            </View>
          ) : null}
        </>
      )}
    </ScreenContainer>
  );
}
