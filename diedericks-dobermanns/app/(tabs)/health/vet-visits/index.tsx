import { useRouter } from 'expo-router';
import { FlatList, Pressable, RefreshControl } from 'react-native';
import { format, parseISO } from 'date-fns';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useVetVisits } from '@/hooks/useHealth';

export default function VetVisitsScreen() {
  const router = useRouter();
  const { data, loading, refresh } = useVetVisits();

  return (
    <ScreenContainer>
      <PageHeader title="Vet Visits" back />
      {loading ? <CardListSkeleton count={5} /> : null}
      {!loading && data.length === 0 ? (
        <EmptyState title="No vet visits" message="Log visits to track health history." />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id as string}
          contentContainerClassName="px-6 pb-12 gap-3"
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Colors.gold} />}
          renderItem={({ item }) => {
            const dog = item.dog as { name?: string } | null;
            return (
              <Pressable onPress={() => router.push(`/(tabs)/health/vet-visits/${item.id}` as never)}>
                <Card>
                  <Typography variant="subtitle">{dog?.name ?? 'Dog'}</Typography>
                  <Typography variant="caption">
                    {format(parseISO(item.visit_date as string), 'dd MMM yyyy · HH:mm')}
                  </Typography>
                  <Typography variant="body" className="mt-1">{String(item.reason)}</Typography>
                  {item.follow_up_required ? (
                    <Typography variant="caption" className="text-amber-400">Follow-up required</Typography>
                  ) : null}
                </Card>
              </Pressable>
            );
          }}
        />
      )}
    </ScreenContainer>
  );
}
