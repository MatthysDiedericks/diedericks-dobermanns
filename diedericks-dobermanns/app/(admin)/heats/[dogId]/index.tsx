import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { HeatCurrentTab } from '@/components/heats/HeatCurrentTab';
import { HeatHelpButton } from '@/components/heats/HeatHelpButton';
import { HeatHistoryTab } from '@/components/heats/HeatHistoryTab';
import { HeatPredictionsTab } from '@/components/heats/HeatPredictionsTab';
import { MatingsTab } from '@/components/heats/MatingsTab';
import { PregnancyControl } from '@/components/heats/PregnancyControl';
import { ProgesteroneEntry } from '@/components/heats/ProgesteroneEntry';
import { TemperatureLogScreen } from '@/components/heats/TemperatureLogScreen';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { Typography } from '@/components/ui/Typography';
import { useDog } from '@/hooks/useDogs';
import { useHeatCyclesForDog } from '@/hooks/useHeatCycles';
import { useMatings } from '@/hooks/useMatings';
import { whelpWindow } from '@/lib/dogs/whelpDates';
import { isActiveHeat } from '@/lib/heats/calculations';
import type { HeatCycleRecord } from '@/lib/heats/constants';
import { scheduleWhelpingTempReminders } from '@/lib/heats/whelpReminders';

const TABS = ['current', 'matings', 'temps', 'history', 'predictions'] as const;
type TabId = (typeof TABS)[number];

/** Pregnant / mated dams — do not wait for the 7-day website gate; Hannah and Odessa need this now. */
function showWhelpWatch(cycle: HeatCycleRecord | null): boolean {
  if (!cycle) return false;
  return (
    cycle.status === 'mated' ||
    cycle.status === 'confirmed_pregnant' ||
    cycle.pregnancy_status === 'pregnant'
  );
}

export default function DogHeatDetailScreen() {
  const { dogId } = useLocalSearchParams<{ dogId: string }>();
  const id = dogId ?? '';
  const { dog, loading: dogLoading } = useDog(id);
  const { cycles, loading: cyclesLoading, refresh } = useHeatCyclesForDog(id);
  const [tab, setTab] = useState<TabId>('current');
  const [refreshing, setRefreshing] = useState(false);
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  const cycle =
    cycles.find(isActiveHeat) ??
    cycles.find((c) => !c.is_predicted && ['mated', 'confirmed_pregnant'].includes(c.status)) ??
    null;

  const { matings } = useMatings(cycle?.id ?? null);
  const lastMating = matings.length
    ? matings[matings.length - 1].mated_at.slice(0, 10)
    : null;
  const whelp = useMemo(
    () =>
      cycle
        ? whelpWindow(
            cycle.ovulation_date,
            cycle.mating_date,
            cycle.expected_whelp_date,
            cycle.heat_start_date,
            lastMating,
            cycle.whelp_date_basis,
          )
        : null,
    [cycle, lastMating],
  );

  useEffect(() => {
    if (!cycle || !whelp || !dog?.name) return;
    void scheduleWhelpingTempReminders({
      cycleId: cycle.id,
      dogName: dog.name,
      earliestWhelpDate: whelp.earliest,
    });
  }, [cycle, whelp, dog?.name]);

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
      <ScrollView
        className="px-4 pb-12"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void refreshRef.current().finally(() => setRefreshing(false));
            }}
          />
        }
      >
        {loading ? (
          <CardListSkeleton count={3} />
        ) : tab === 'current' ? (
          <>
            <HeatCurrentTab
              dog={dog}
              dogId={id}
              cycles={cycles}
              lastMating={lastMating}
              onRefresh={() => void refreshRef.current()}
            />
            {cycle && whelp ? (
              <>
                <PregnancyControl
                  cycle={cycle}
                  whelp={whelp}
                  onSaved={() => void refreshRef.current()}
                />
                <ProgesteroneEntry
                  cycle={cycle}
                  dogId={id}
                  onChanged={() => void refreshRef.current()}
                />
                {showWhelpWatch(cycle) ? (
                  <View className="mt-6">
                    <Typography variant="subtitle" className="mb-3 text-gold">
                      Whelping watch
                    </Typography>
                    <TemperatureLogScreen cycle={cycle} dogName={dog?.name ?? 'Dam'} />
                  </View>
                ) : null}
              </>
            ) : null}
          </>
        ) : tab === 'matings' ? (
          <MatingsTab cycle={cycle} onChanged={() => void refreshRef.current()} />
        ) : tab === 'temps' ? (
          <TemperatureLogScreen cycle={cycle} dogName={dog?.name ?? 'Dam'} />
        ) : tab === 'history' ? (
          <HeatHistoryTab cycles={cycles} />
        ) : (
          <HeatPredictionsTab cycles={cycles} dateOfBirth={dog?.date_of_birth} />
        )}
      </ScrollView>
    </ScreenContainer>
  );
}
