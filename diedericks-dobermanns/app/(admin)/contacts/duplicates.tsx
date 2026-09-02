import { FlatList, RefreshControl, View } from 'react-native';

import { DuplicatePairCard } from '@/components/contacts/DuplicatePairCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useContactDuplicates } from '@/hooks/useContactDuplicates';

export default function ContactDuplicatesScreen() {
  const { pairs, loading, error, refresh, merge, dismiss } = useContactDuplicates();

  return (
    <ScreenContainer scroll={false}>
      <PageHeader eyebrow="CRM" title="Duplicate contacts" />
      <Typography variant="caption" className="mb-3 px-6 text-subtle">
        Review pairs that share an email or phone but need a human decision before merging.
      </Typography>

      {loading && pairs.length === 0 ? (
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

      {!loading && !error && pairs.length === 0 ? (
        <EmptyState
          title="No open duplicate candidates"
          message="Merged and dismissed pairs stay out of this queue."
        />
      ) : (
        <FlatList
          data={pairs}
          keyExtractor={(item) => item.candidateId}
          contentContainerClassName="px-6 pb-24 gap-4"
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Colors.gold} />
          }
          renderItem={({ item }) => (
            <DuplicatePairCard
              pair={item}
              onMerge={(survivorId, loserId) => merge(item.candidateId, survivorId, loserId)}
              onDismiss={() => dismiss(item.candidateId)}
            />
          )}
        />
      )}
    </ScreenContainer>
  );
}
