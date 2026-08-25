import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { LitterHistoryTable } from '@/components/litters/LitterRow';
import { LitterListCard } from '@/components/litters/LitterListCard';
import { LitterListFilters } from '@/components/litters/LitterListFilters';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { deriveLitterCount } from '@/lib/litters/derivedCounts';
import { useLitterPuppySearch } from '@/hooks/useLitterPuppySearch';
import { useFemaleLitterHistory, useLittersIndex } from '@/hooks/useLittersIndex';
import { useLitterListPrefs } from '@/hooks/useLitterListPrefs';
import {
  buildDamOptions,
  buildYearOptions,
  emptyLittersMessage,
  filterAndSortLitters,
} from '@/lib/litters/listPrefs';

type ViewMode = 'all' | 'female';

export default function AdminLittersScreen() {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>('all');
  const [femaleId, setFemaleId] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const { prefs, patch, clearFilters } = useLitterListPrefs();
  const { litters, countsByLitterId, loading, error, refresh } = useLittersIndex();
  const femaleHistory = useFemaleLitterHistory(view === 'female' ? femaleId : undefined);
  const query = search.trim();
  const searchLitterIds = useLitterPuppySearch(query);

  const dams = useMemo(() => buildDamOptions(litters), [litters]);
  const years = useMemo(() => buildYearOptions(litters), [litters]);
  const filtered = useMemo(() => filterAndSortLitters(litters, prefs), [litters, prefs]);

  const listData = useMemo(() => {
    if (!query) return filtered;
    if (!searchLitterIds) return [];
    const allow = new Set(searchLitterIds);
    return litters.filter((l) => allow.has(l.id));
  }, [query, searchLitterIds, filtered, litters]);

  const emptyMessage = query
    ? 'No puppy matches that name or microchip number.'
    : emptyLittersMessage(prefs, dams);

  return (
    <ScreenContainer scroll={false}>
      <PageHeader eyebrow="Breeding" title="Litters" back={false} />
      <View className="mb-4 flex-row items-center justify-between px-6">
        <Button label="+ New Litter" onPress={() => router.push('/(admin)/litters/new')} />
        <View className="flex-row gap-2">
          {(['all', 'female'] as const).map((v) => (
            <Pressable
              key={v}
              onPress={() => setView(v)}
              className={`rounded-full border px-3 py-2 ${view === v ? 'border-gold bg-gold/15' : 'border-gold/25'}`}
            >
              <Typography variant="caption">{v === 'all' ? 'ALL LITTERS' : 'BY FEMALE'}</Typography>
            </Pressable>
          ))}
        </View>
      </View>

      {view === 'all' ? (
        <>
          <View className="px-6">
            <Input
              value={search}
              onChangeText={setSearch}
              placeholder="Search by name or microchip number…"
              autoCapitalize="none"
              containerClassName="mb-3"
            />
          </View>

          {!query ? (
            <LitterListFilters
              prefs={prefs}
              dams={dams}
              years={years}
              onPatch={patch}
              onClearFilters={clearFilters}
            />
          ) : null}

          {error ? (
            <Typography variant="body" className="mb-2 px-6 text-danger">
              {error}
            </Typography>
          ) : null}
          {!query ? (
            <Typography variant="caption" className="mb-2 px-6 text-subtle">
              Showing {filtered.length} of {litters.length}
            </Typography>
          ) : null}
          {query && listData.length > 0 ? (
            <Typography variant="caption" className="mb-3 px-6 text-subtle">
              {listData.length} litter{listData.length === 1 ? '' : 's'} match &quot;{query}&quot;
            </Typography>
          ) : null}

          {loading ? (
            <View className="px-6">
              <CardListSkeleton count={3} />
            </View>
          ) : listData.length === 0 ? (
            <View className="px-6">
              <EmptyState title="No litters" message={emptyMessage} />
            </View>
          ) : (
            <FlatList
              data={listData}
              keyExtractor={(litter) => litter.id}
              contentContainerClassName="px-6 pb-12"
              initialNumToRender={6}
              refreshControl={
                <RefreshControl refreshing={loading} onRefresh={() => void refresh()} tintColor={Colors.gold} />
              }
              renderItem={({ item }) => (
                <LitterListCard
                  litter={item}
                  count={
                    countsByLitterId[item.id] ??
                    deriveLitterCount(undefined, {
                      available_count: item.available_count,
                      puppy_count: item.puppy_count,
                    })
                  }
                  highlightQuery={query || undefined}
                  autoExpand={Boolean(query)}
                />
              )}
            />
          )}
        </>
      ) : (
        <ScrollView className="px-6 pb-12">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            <Pressable
              onPress={() => setFemaleId(undefined)}
              className={`mr-2 rounded-full border px-3 py-2 ${!femaleId ? 'border-gold bg-gold/15' : 'border-gold/25'}`}
            >
              <Typography variant="caption">All dams</Typography>
            </Pressable>
            {dams.map((f) => (
              <Pressable
                key={f.id}
                onPress={() => setFemaleId(f.id)}
                className={`mr-2 rounded-full border px-3 py-2 ${femaleId === f.id ? 'border-gold bg-gold/15' : 'border-gold/25'}`}
              >
                <Typography variant="caption">
                  {f.name} ({f.count})
                </Typography>
              </Pressable>
            ))}
          </ScrollView>
          {femaleHistory.loading ? <CardListSkeleton count={2} /> : null}
          <LitterHistoryTable rows={femaleHistory.rows} />
        </ScrollView>
      )}
    </ScreenContainer>
  );
}
