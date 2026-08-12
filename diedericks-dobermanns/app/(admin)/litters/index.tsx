import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { LitterListFilters } from '@/components/litters/LitterListFilters';
import { LitterHistoryTable } from '@/components/litters/LitterRow';
import { PuppyCard } from '@/components/litters/PuppyCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { isActiveLitter, useFemaleLitterHistory, useLittersIndex } from '@/hooks/useLittersIndex';
import { useLitterListPrefs } from '@/hooks/useLitterListPrefs';
import { formatKennelDate, formatPuppyAge } from '@/lib/kennel/formatters';
import {
  buildDamOptions,
  buildYearOptions,
  emptyLittersMessage,
  filterAndSortLitters,
} from '@/lib/litters/listPrefs';

type ViewMode = 'all' | 'female';
type LitterRow = ReturnType<typeof useLittersIndex>['litters'][0];
type PuppyRow = LitterRow['puppies'][0];

function puppyMatches(puppy: PuppyRow, query: string): boolean {
  if (puppy.name.toLowerCase().includes(query.toLowerCase())) return true;
  return !!puppy.microchip_number && puppy.microchip_number.includes(query);
}

export default function AdminLittersScreen() {
  const router = useRouter();
  const [view, setView] = useState<ViewMode>('all');
  const [femaleId, setFemaleId] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const { prefs, patch, clearFilters } = useLitterListPrefs();
  const { litters, loading, error, refresh } = useLittersIndex();
  const femaleHistory = useFemaleLitterHistory(view === 'female' ? femaleId : undefined);

  const dams = useMemo(() => buildDamOptions(litters), [litters]);
  const years = useMemo(() => buildYearOptions(litters), [litters]);
  const query = search.trim();

  const searchResults = useMemo(() => {
    if (!query) return [];
    return litters.filter((l) => l.puppies.some((p) => puppyMatches(p, query)));
  }, [litters, query]);

  const filtered = useMemo(() => filterAndSortLitters(litters, prefs), [litters, prefs]);

  const listData = useMemo(() => {
    if (query) return searchResults;
    return filtered;
  }, [query, searchResults, filtered]);

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

          {error ? <Typography variant="body" className="mb-2 px-6 text-danger">{error}</Typography> : null}
          {!query ? (
            <Typography variant="caption" className="mb-2 px-6 text-subtle">
              Showing {filtered.length} of {litters.length}
            </Typography>
          ) : null}
          {query && searchResults.length > 0 ? (
            <Typography variant="caption" className="mb-3 px-6 text-subtle">
              {searchResults.length} litter{searchResults.length === 1 ? '' : 's'} match &quot;{query}&quot;
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
                <LitterGroup litter={item} active={isActiveLitter(item.status)} highlightQuery={query || undefined} />
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

function LitterGroup({
  litter,
  active = false,
  highlightQuery,
}: {
  litter: LitterRow;
  active?: boolean;
  highlightQuery?: string;
}) {
  const router = useRouter();
  const letter = litter.litter_letter ? `Litter ${litter.litter_letter}` : litter.name ?? 'Litter';
  const dateLabel = litter.actual_date ?? litter.expected_date;
  return (
    <View className="mb-8">
      <View className="mb-2 flex-row items-start justify-between">
        <View className="flex-1 pr-2">
          <Typography variant="subtitle">
            {formatKennelDate(dateLabel)}
            {litter.go_home_date
              ? ` (${formatPuppyAge(litter.actual_date)} · home ${formatKennelDate(litter.go_home_date)})`
              : ''}
          </Typography>
          <Typography variant="bodyMuted">
            {letter} · Dam: {litter.mother?.name ?? '—'} · Sire: {litter.father?.name ?? '—'}
          </Typography>
        </View>
        <View className="items-end gap-2">
          {active ? <Badge label="ACTIVE" tone="gold" /> : null}
          {!active && litter.status === 'expected' ? <Badge label="EXPECTED" tone="muted" /> : null}
          <Pressable onPress={() => router.push(`/(admin)/litters/${litter.id}` as never)}>
            <Typography variant="label" className="text-gold">
              Go To Litter →
            </Typography>
          </Pressable>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
        {(litter.puppies ?? []).map((p) => (
          <PuppyCard
            key={p.id}
            {...p}
            highlighted={!!highlightQuery && puppyMatches(p, highlightQuery)}
          />
        ))}
      </ScrollView>
    </View>
  );
}
