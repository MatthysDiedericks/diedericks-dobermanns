import { FlatList, RefreshControl, View } from 'react-native';

import { PendingMediaRow } from '@/components/media/PendingMediaRow';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { usePendingMedia } from '@/hooks/usePendingMedia';

export default function PendingMediaScreen() {
  const { items, loading, error, refresh, publish, decline, remove } = usePendingMedia();

  return (
    <ScreenContainer scroll={false}>
      <PageHeader eyebrow="Media" title="Pending photos" />
      <Typography variant="caption" className="mb-3 px-6 text-subtle">
        Photos and videos awaiting a publish decision. Approving an owner photo sets it public on
        that dog&apos;s profile only.
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
          renderItem={({ item }) => (
            <PendingMediaRow
              item={item}
              onPublish={publish}
              onDecline={decline}
              onDelete={remove}
            />
          )}
        />
      )}
    </ScreenContainer>
  );
}
