import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, View } from 'react-native';

import {
  AddHeatBottomSheet,
  type AddHeatBottomSheetHandle,
} from '@/components/heats/AddHeatBottomSheet';
import { FemaleHeatCard } from '@/components/heats/FemaleHeatCard';
import { HeatHelpButton } from '@/components/heats/HeatHelpButton';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useFemaleHeatSummaries } from '@/hooks/useHeatCycles';
import type { FemaleHeatSummary } from '@/lib/heats/constants';

type Filter = 'all' | 'active' | 'predicted' | 'overdue';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'predicted', label: 'Predicted' },
  { id: 'overdue', label: 'Overdue' },
];

function matchesFilter(s: FemaleHeatSummary, filter: Filter): boolean {
  if (filter === 'active') return Boolean(s.activeHeat);
  if (filter === 'predicted') return Boolean(s.nextPredicted && !s.isOverdue);
  if (filter === 'overdue') return s.isOverdue;
  return true;
}

export default function HeatsScreen() {
  const router = useRouter();
  const { summaries, loading, error, refresh } = useFemaleHeatSummaries();
  const [filter, setFilter] = useState<Filter>('all');
  const addHeatRef = useRef<AddHeatBottomSheetHandle>(null);

  const filtered = useMemo(
    () => summaries.filter((s) => matchesFilter(s, filter)),
    [summaries, filter],
  );

  return (
    <ScreenContainer scroll={false}>
      <View className="flex-row items-start justify-between px-6">
        <View className="flex-1">
          <PageHeader eyebrow="Breeding" title="Heat Cycles" back={false} />
        </View>
        <View className="mt-2 flex-row gap-2">
          <HeatHelpButton />
          <Pressable
            onPress={() => addHeatRef.current?.open()}
            className="h-10 w-10 items-center justify-center rounded-full border border-gold/40 bg-gold/10"
            accessibilityLabel="Add heat cycle"
          >
            <Ionicons name="add" size={22} color={Colors.gold} />
          </Pressable>
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mb-4 max-h-12 px-4"
        contentContainerStyle={{ gap: 8 }}
      >
        {FILTERS.map((f) => (
          <Pressable
            key={f.id}
            onPress={() => setFilter(f.id)}
            className={`rounded-full border px-4 py-2 ${
              filter === f.id ? 'border-gold bg-gold/15' : 'border-gold/25'
            }`}
          >
            <Typography variant="caption">{f.label}</Typography>
          </Pressable>
        ))}
      </ScrollView>

      {error ? (
        <Typography variant="body" className="px-6 text-danger">
          {error}
        </Typography>
      ) : null}

      {loading ? (
        <View className="px-6">
          <CardListSkeleton count={5} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 48 }}
          refreshing={loading}
          onRefresh={() => void refresh()}
          ListEmptyComponent={
            <View>
              <EmptyState
                title="No heat cycles yet"
                message="Record a heat cycle for a breeding female to start tracking."
              />
              <Button label="Add Heat" onPress={() => addHeatRef.current?.open()} className="mt-4" />
            </View>
          }
          renderItem={({ item }) => (
            <FemaleHeatCard
              summary={item}
              onPress={() => router.push(`/(admin)/heats/${item.id}` as never)}
            />
          )}
        />
      )}

      <AddHeatBottomSheet ref={addHeatRef} onSaved={() => void refresh()} />
    </ScreenContainer>
  );
}
