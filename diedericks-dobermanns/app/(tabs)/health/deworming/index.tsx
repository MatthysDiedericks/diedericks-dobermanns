import { FlatList, RefreshControl } from 'react-native';
import { format, parseISO } from 'date-fns';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useDewormingRecords } from '@/hooks/useHealth';

export default function DewormingScreen() {
  const { data, loading, refresh } = useDewormingRecords();

  return (
    <ScreenContainer>
      <PageHeader title="Worms / Ticks & Fleas" back />
      {loading ? <CardListSkeleton count={5} /> : null}
      {!loading && data.length === 0 ? (
        <EmptyState title="No treatments" message="Deworming and parasite treatments will show here." />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id as string}
          contentContainerClassName="px-6 pb-12 gap-3"
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Colors.gold} />}
          renderItem={({ item }) => (
            <Card>
              <Typography variant="subtitle">{String(item.product_name ?? item.treatment_type)}</Typography>
              <Typography variant="caption">
                Treated {format(parseISO(item.date_treated as string), 'dd MMM yyyy')}
              </Typography>
              {item.next_due_date ? (
                <Typography variant="caption" className="text-gold">
                  Next {format(parseISO(item.next_due_date as string), 'dd MMM yyyy')}
                </Typography>
              ) : null}
            </Card>
          )}
        />
      )}
    </ScreenContainer>
  );
}
