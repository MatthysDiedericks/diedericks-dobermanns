import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, ScrollView, Pressable, View } from 'react-native';

import { UnallocatedDogRow } from '@/components/dogs/UnallocatedDogRow';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListSearch, noMatchLine } from '@/components/ui/ListSearch';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useUnallocatedSales } from '@/hooks/useUnallocatedSales';
import {
  matchesProgrammeFilter,
  PROGRAMME_TIER_SELECT_OPTIONS,
} from '@/lib/dogs/programmeTier';
import { rowMatches } from '@/lib/search/match';

export default function UnallocatedSalesScreen() {
  const { dogs, clients, loading, error, refresh, allocate } = useUnallocatedSales();
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState('all');

  const rows = useMemo(() => {
    return dogs.filter((d) => {
      if (!matchesProgrammeFilter(d.programme_tier, tier)) return false;
      return rowMatches(search, { text: [d.name] });
    });
  }, [dogs, search, tier]);

  return (
    <ScreenContainer scroll={false}>
      <PageHeader eyebrow="Dogs" title="Unallocated sales" />
      <Typography variant="caption" className="mb-3 px-6 text-subtle">
        {dogs.length} sold {dogs.length === 1 ? 'dog' : 'dogs'} not yet linked to a client login.
        Older lost-contact sales stay on litter records.
      </Typography>

      <View className="px-6 mb-3">
        <ListSearch
          value={search}
          onChangeText={setSearch}
          placeholder="Search by dog or buyer name…"
          shown={rows.length}
          total={dogs.length}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
          <Pressable
            onPress={() => setTier('all')}
            className={`mr-2 rounded-full border px-3 py-1.5 ${
              tier === 'all' ? 'border-gold bg-gold/15' : 'border-gold/30'
            }`}
          >
            <Typography variant="caption">All programme tiers</Typography>
          </Pressable>
          {PROGRAMME_TIER_SELECT_OPTIONS.map((opt) => {
            const value = opt.value || 'unset';
            return (
              <Pressable
                key={value}
                onPress={() => setTier(value)}
                className={`mr-2 rounded-full border px-3 py-1.5 ${
                  tier === value ? 'border-gold bg-gold/15' : 'border-gold/30'
                }`}
              >
                <Typography variant="caption">{opt.label}</Typography>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading && dogs.length === 0 ? (
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

      {!loading && !error && dogs.length === 0 ? (
        <View className="px-6">
          <EmptyState
            title="No recent unallocated sales"
            message="Older sold dogs without a captured buyer stay on litter and pedigree records as Lost contact."
          />
        </View>
      ) : !loading && !error && rows.length === 0 ? (
        <View className="px-6">
          <EmptyState title={noMatchLine('sale', search || tier)} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-6 pb-24 gap-3"
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Colors.gold} />
          }
          renderItem={({ item }) => (
            <UnallocatedDogRow dog={item} clients={clients} onAllocate={allocate} />
          )}
        />
      )}
    </ScreenContainer>
  );
}
