import { useRouter } from 'expo-router';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { format, parseISO } from 'date-fns';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useVaccinations } from '@/hooks/useHealth';

function dueLabel(date: string | null) {
  if (!date) return '';
  const days = Math.ceil((parseISO(date).getTime() - Date.now()) / 86_400_000);
  if (days < 0) return `OVERDUE ${-days} days`;
  if (days === 0) return 'Due today';
  return `Due in ${days} days`;
}

export default function VaccinationsScreen() {
  const router = useRouter();
  const { data, loading, refresh } = useVaccinations();

  return (
    <ScreenContainer>
      <PageHeader title="Vaccinations" back />
      {loading ? <CardListSkeleton count={5} /> : null}
      {!loading && data.length === 0 ? (
        <EmptyState title="No vaccinations" message="Records will appear when logged." />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id as string}
          contentContainerClassName="px-6 pb-12 gap-3"
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Colors.gold} />}
          renderItem={({ item }) => {
            const dog = item.dog as { name?: string } | null;
            const next = item.next_due_date as string | null;
            return (
              <Pressable onPress={() => router.push(`/(tabs)/health/vaccinations/${item.id}` as never)}>
                <Card>
                  <Typography variant="subtitle">{item.vaccine_name as string}</Typography>
                  <Typography variant="caption">{dog?.name ?? 'Dog'}</Typography>
                  <Typography variant="caption" className="text-subtle">
                    Given {format(parseISO(item.date_administered as string), 'dd MMM yyyy')}
                  </Typography>
                  {next ? (
                    <Typography variant="caption" className="text-gold mt-1">{dueLabel(next)}</Typography>
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
