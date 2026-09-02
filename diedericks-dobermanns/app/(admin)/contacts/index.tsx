import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';

import { ContactListRow } from '@/components/contacts/ContactListRow';
import { ContactTypeChips, type ContactTypeFilter } from '@/components/contacts/ContactTypeChips';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListSearch, noMatchLine } from '@/components/ui/ListSearch';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useContactSummary, useContacts } from '@/hooks/useContacts';
import { useOpenDuplicateCount } from '@/hooks/useContactDuplicates';
import { contactMatches } from '@/lib/contacts/search';

export default function AdminContactsScreen() {
  const router = useRouter();
  const [typeFilter, setTypeFilter] = useState<ContactTypeFilter>('all');
  const [search, setSearch] = useState('');

  const { data, loading, error, refresh } = useContacts();
  const { summary } = useContactSummary();
  const { count: openDupes, refresh: refreshDupes } = useOpenDuplicateCount();

  const typed = useMemo(() => {
    if (typeFilter === 'all') return data;
    return data.filter((c) => (c.contact_type ?? 'prospect') === typeFilter);
  }, [data, typeFilter]);

  const rows = useMemo(
    () => typed.filter((c) => contactMatches(c, search)),
    [typed, search],
  );

  const onRefresh = () => {
    void refresh();
    void refreshDupes();
  };

  return (
    <ScreenContainer scroll={false}>
      <PageHeader eyebrow="CRM" title="Contacts" />

      <Typography variant="caption" className="mb-3 px-6 text-subtle">
        {summary.client} clients · {summary.prospect} prospects · {summary.other} other
      </Typography>

      {openDupes > 0 ? (
        <Pressable
          onPress={() => router.push('/(admin)/contacts/duplicates' as never)}
          className="mx-6 mb-3 rounded-sm border border-gold/30 bg-gold/10 px-4 py-3"
        >
          <Typography variant="label" className="text-gold">
            {openDupes} possible duplicate{openDupes === 1 ? '' : 's'}
          </Typography>
        </Pressable>
      ) : null}

      <View className="px-6 mb-3">
        <ContactTypeChips value={typeFilter} onChange={setTypeFilter} />
        <ListSearch
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, email, phone or WhatsApp"
          shown={rows.length}
          total={typed.length}
        />
      </View>

      {loading && data.length === 0 ? (
        <View className="px-6">
          <CardListSkeleton count={5} />
        </View>
      ) : null}

      {error ? (
        <View className="px-6">
          <Typography variant="body" className="text-danger">
            {error}
          </Typography>
        </View>
      ) : null}

      {!loading && !error && rows.length === 0 ? (
        <EmptyState
          title={search.trim() ? noMatchLine('contact', search) : 'No contacts'}
          message={search.trim() ? undefined : 'Add a contact or adjust your filters.'}
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-6 pb-24 gap-3"
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={onRefresh} tintColor={Colors.gold} />
          }
          renderItem={({ item }) => <ContactListRow item={item} query={search} />}
        />
      )}
    </ScreenContainer>
  );
}
