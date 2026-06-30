import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { DogStatusBadge } from '@/components/dogs/DogStatusBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useAdminDogs } from '@/hooks/useAdmin';
import { titleCase } from '@/lib/format';

export default function AdminBreedingStockScreen() {
  const router = useRouter();
  const { data: dogs, loading } = useAdminDogs();
  const breeders = dogs.filter(
    (d) => d.category === 'breeding_stock' || d.status === 'breeding_stock',
  );

  return (
    <ScreenContainer>
      <PageHeader eyebrow="The Programme" title="Breeding Stock" />

      <View className="mb-4 px-6">
        <Button
          label="Breeding Programme"
          variant="outline"
          onPress={() => router.push('/(admin)/breeding/index' as never)}
          fullWidth
          className="mb-3"
        />
        <Button
          label="+ Add Breeding Stock"
          onPress={() =>
            router.push({
              pathname: '/(admin)/dogs/new',
              params: { category: 'breeding_stock' },
            })
          }
          fullWidth
        />
      </View>

      {loading ? <CardListSkeleton count={4} /> : null}

      <View className="gap-3 px-6">
        {!loading && breeders.length === 0 ? (
          <EmptyState
            title="No breeding stock yet"
            message="Add your sires and dams to build out the breeding programme."
          />
        ) : loading ? null : (
          breeders.map((dog) => (
            <Pressable
              key={dog.id}
              onPress={() => router.push(`/(admin)/dogs/${dog.id}/edit`)}
            >
              <Card className="flex-row items-center">
                <View className="h-14 w-14 overflow-hidden rounded-xl bg-surface">
                  {dog.media?.[0] ? (
                    <Image
                      source={{ uri: dog.media[0].url }}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                  ) : null}
                </View>
                <View className="ml-4 flex-1">
                  <Typography variant="subtitle" numberOfLines={1}>
                    {dog.name}
                  </Typography>
                  <Typography variant="caption" className="mt-0.5">
                    {titleCase(dog.sex)} · {titleCase(dog.bloodline)}
                  </Typography>
                  <View className="mt-2 flex-row items-center gap-2">
                    <DogStatusBadge status={dog.status} />
                  </View>
                </View>
                <Pressable
                  onPress={() =>
                    router.push({ pathname: '/(admin)/dogs/[id]/pedigree', params: { id: dog.id } })
                  }
                  hitSlop={8}
                  className="mr-3 h-9 w-9 items-center justify-center rounded-full border border-gold/25 bg-black-rich"
                >
                  <Ionicons name="git-network-outline" size={16} color={Colors.gold} />
                </Pressable>
                <Ionicons name="create-outline" size={18} color={Colors.gold} />
              </Card>
            </Pressable>
          ))
        )}
      </View>
    </ScreenContainer>
  );
}
