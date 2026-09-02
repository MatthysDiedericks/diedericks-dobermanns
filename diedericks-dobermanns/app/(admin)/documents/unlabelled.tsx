import { FlatList, RefreshControl, View } from 'react-native';

import { UnlabelledDocumentRow } from '@/components/documents/UnlabelledDocumentRow';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useUnlabelledDocuments } from '@/hooks/useUnlabelledDocuments';

export default function UnlabelledDocumentsScreen() {
  const { items, loading, error, refresh, saveLabel } = useUnlabelledDocuments();

  return (
    <ScreenContainer scroll={false}>
      <PageHeader eyebrow="Documents" title="Unlabelled" />
      <Typography variant="caption" className="mb-3 px-6 text-subtle">
        {items.length} file{items.length === 1 ? '' : 's'} still in Other. Name them once so a
        handover pack never prints a divider that says “a”.
      </Typography>

      {loading && items.length === 0 ? (
        <View className="px-6">
          <CardListSkeleton count={4} />
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
          <EmptyState
            title="Every document has a real name and category."
            message="Nothing left in Other, and no files named 1–4."
          />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-6 pb-24 gap-3"
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Colors.gold} />
          }
          renderItem={({ item }) => <UnlabelledDocumentRow item={item} onSave={saveLabel} />}
        />
      )}
    </ScreenContainer>
  );
}
