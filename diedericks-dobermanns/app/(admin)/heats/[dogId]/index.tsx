import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { HeatCurrentTab } from '@/components/heats/HeatCurrentTab';
import { HeatHelpButton } from '@/components/heats/HeatHelpButton';
import { HeatHistoryTab } from '@/components/heats/HeatHistoryTab';
import { HeatPredictionsTab } from '@/components/heats/HeatPredictionsTab';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { Typography } from '@/components/ui/Typography';
import { useDog } from '@/hooks/useDogs';
import { useHeatCyclesForDog } from '@/hooks/useHeatCycles';

const TABS = ['current', 'history', 'predictions'] as const;
type TabId = (typeof TABS)[number];

export default function DogHeatDetailScreen() {
  const { dogId } = useLocalSearchParams<{ dogId: string }>();
  const id = dogId ?? '';
  const { dog, loading: dogLoading } = useDog(id);
  const { cycles, loading: cyclesLoading, refresh } = useHeatCyclesForDog(id);
  const [tab, setTab] = useState<TabId>('current');
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  const loading = dogLoading || cyclesLoading;

  return (
    <ScreenContainer scroll={false}>
      <View className="flex-row items-start justify-between px-6">
        <View className="flex-1">
          <PageHeader eyebrow="Heat cycles" title={dog?.name ?? 'Dam'} />
        </View>
        <HeatHelpButton />
      </View>
      <ScrollView horizontal className="mb-4 max-h-12 px-4" contentContainerStyle={{ gap: 8 }}>
        {TABS.map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            className={`rounded-full border px-4 py-2 capitalize ${
              tab === t ? 'border-gold bg-gold/15' : 'border-gold/25'
            }`}
          >
            <Typography variant="caption">{t}</Typography>
          </Pressable>
        ))}
      </ScrollView>
      <ScrollView className="px-4 pb-12">
        {loading ? (
          <CardListSkeleton count={3} />
        ) : tab === 'current' ? (
          <HeatCurrentTab
            dog={dog}
            dogId={id}
            cycles={cycles}
            onRefresh={() => void refreshRef.current()}
          />
        ) : tab === 'history' ? (
          <HeatHistoryTab cycles={cycles} />
        ) : (
          <HeatPredictionsTab dogId={id} cycles={cycles} />
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
