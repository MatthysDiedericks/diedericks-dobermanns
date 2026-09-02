import { FlatList, RefreshControl, View } from 'react-native';

import { PendingClientQueueRow } from '@/components/documents/PendingClientQueueRow';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { usePendingClientDocuments } from '@/hooks/usePendingClientDocuments';

export default function PendingClientDocumentsScreen() {
  const { items, loading, error, refresh, review } = usePendingClientDocuments();

  return (
    <ScreenContainer scroll={false}>
      <PageHeader eyebrow="Documents" title="Pending client files" />
      <Typography variant="caption" className="mb-3 px-6 text-subtle">
        Vet paperwork and other files owners have sent in. Confirm or ask for a clearer copy —
        nothing is sent automatically.
      </Typography>

      {loading && items.length === 0 ? (
        <View className="px-6">
          <CardListSkeleton count={3} />
        </View>
      ) : null}

      {error ? (
        <View className="px-6">
          <Typography variant="body" className="text-danger">
            {error}
          </Typography>
        </View>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <View className="px-6">
          <EmptyState title="Nothing waiting for review." />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-6 pb-24 gap-3"
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Colors.gold} />
          }
          renderItem={({ item }) => <PendingClientQueueRow item={item} onReview={review} />}
        />
      )}
    </ScreenContainer>
  );
}
