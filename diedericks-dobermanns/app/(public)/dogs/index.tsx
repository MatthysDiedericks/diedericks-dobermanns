import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { DogCard } from '@/components/dogs/DogCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Colors } from '@/constants/colors';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { DogGridSkeleton } from '@/components/ui/Skeleton';
import { Typography } from '@/components/ui/Typography';
import { useDogs } from '@/hooks/useDogs';
import type { DogStatus } from '@/types/app.types';

type Filter = 'all' | 'available' | 'breeding_stock' | 'training_dog';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'available', label: 'Available' },
  { key: 'training_dog', label: 'In Training' },
  { key: 'breeding_stock', label: 'Breeding' },
];

export default function DogsScreen() {
  const { dogs, loading } = useDogs();
  const [filter, setFilter] = useState<Filter>('all');

  const visible = dogs.filter((d) => {
    if (filter === 'all') return true;
    if (filter === 'available') return d.status === ('available' as DogStatus);
    return d.category === filter;
  });

  return (
    <ScreenContainer>
      <PageHeader eyebrow="The Kennel" title="Our Dogs" back={false} />

      <View className="mb-4 px-6">
        <Link href="/(public)/breeding-stock" asChild>
          <Pressable className="flex-row items-center justify-between rounded-2xl border border-gold/20 bg-black-rich px-4 py-3.5">
            <View className="flex-row items-center gap-3">
              <Ionicons name="ribbon" size={18} color={Colors.gold} />
              <Typography variant="subtitle">Our Sires & Dams</Typography>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.silver} />
          </Pressable>
        </Link>
      </View>

      <View className="mb-6 flex-row flex-wrap gap-2 px-6">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              className={`rounded-full border px-4 py-2 ${
                active ? 'border-gold bg-gold/15' : 'border-gold/20 bg-black-rich'
              }`}
            >
              <Typography
                variant="caption"
                className={active ? 'text-gold' : 'text-silver'}
              >
                {f.label}
              </Typography>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <DogGridSkeleton count={4} />
      ) : (
        <View className="gap-4 px-6">
          {visible.length === 0 ? (
            <EmptyState
              title="No dogs to show"
              message="Check back soon — new dogs are added regularly."
            />
          ) : (
            visible.map((dog) => <DogCard key={dog.id} dog={dog} />)
          )}
        </View>
      )}
    </ScreenContainer>
  );
}
