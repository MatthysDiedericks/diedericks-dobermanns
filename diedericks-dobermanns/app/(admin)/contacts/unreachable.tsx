import { FlatList, RefreshControl, View } from 'react-native';

import { UnreachableContactCard } from '@/components/contacts/UnreachableContactCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useUnreachableContacts } from '@/hooks/useUnreachableContacts';

export default function UnreachableContactsScreen() {
  const { data, loading, error, refresh } = useUnreachableContacts();

  return (
    <ScreenContainer scroll={false}>
      <PageHeader eyebrow="CRM" title="Cannot be reached" />
      <Typography variant="caption" className="mb-3 px-6 text-subtle">
        No phone and no email. Add a number, or mark cannot trace so they leave this list.
      </Typography>
      <Typography variant="caption" className="mb-3 px-6 text-muted">
        {data.length} contact{data.length === 1 ? '' : 's'}
      </Typography>

      {loading && data.length === 0 ? (
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

      {!loading && !error && data.length === 0 ? (
        <EmptyState title="Every active contact has a phone or an email." />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-6 pb-24 gap-3"
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Colors.gold} />
          }
          renderItem={({ item }) => (
            <UnreachableContactCard row={item} onChanged={() => void refresh()} />
          )}
        />
      )}
    </ScreenContainer>
  );
}
