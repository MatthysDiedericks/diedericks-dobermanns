import { useRouter } from 'expo-router';
import { FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { Image } from 'expo-image';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useLittersWithPuppies } from '@/hooks/useDogs';
import { formatKennelDate } from '@/lib/kennel/formatters';
import type { Dog } from '@/types/app.types';

function PuppyCard({ puppy }: { puppy: Dog }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(`/(tabs)/dogs/${puppy.id}` as never)}
      className="mr-3 w-28 rounded-xl border border-gold/20 bg-surface p-2"
    >
      <View className="h-16 rounded-lg bg-black-rich overflow-hidden mb-1">
        {puppy.media?.[0] ? (
          <Image source={{ uri: puppy.media[0].url }} style={{ width: '100%', height: '100%' }} />
        ) : null}
      </View>
      <Typography variant="caption" numberOfLines={1}>{puppy.name}</Typography>
      <Typography variant="caption" className="text-subtle">
        {puppy.sex === 'male' ? '♂' : '♀'}
      </Typography>
    </Pressable>
  );
}

export default function LittersScreen() {
  const router = useRouter();
  const { litters, loading, refresh } = useLittersWithPuppies();

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Kennel" title="Litters" back />
      {loading ? <CardListSkeleton count={4} /> : null}
      {!loading && litters.length === 0 ? (
        <EmptyState title="No litters" message="Litters will appear grouped with their puppies." />
      ) : (
        <FlatList
          data={litters}
          keyExtractor={(item) => item.id as string}
          contentContainerClassName="px-6 pb-12 gap-4"
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Colors.gold} />}
          renderItem={({ item }) => {
            const mother = item.mother as { name?: string } | null;
            const father = item.father as { name?: string } | null;
            return (
              <Card>
                <Pressable onPress={() => router.push(`/(tabs)/dogs/litters/${item.id}` as never)}>
                  <Typography variant="subtitle" className="text-gold">
                    {(item.name as string) ?? 'Litter'}
                  </Typography>
                  <Typography variant="caption">
                    {mother?.name ?? '—'} × {father?.name ?? '—'}
                  </Typography>
                  <Typography variant="caption" className="text-subtle">
                    DOB {formatKennelDate(item.actual_date as string)} · Go home {formatKennelDate(item.go_home_date as string)}
                  </Typography>
                </Pressable>
                <ScrollView horizontal className="mt-3" showsHorizontalScrollIndicator={false}>
                  {(item.puppies ?? []).map((p) => <PuppyCard key={p.id} puppy={p} />)}
                </ScrollView>
              </Card>
            );
          }}
        />
      )}
    </ScreenContainer>
  );
}
