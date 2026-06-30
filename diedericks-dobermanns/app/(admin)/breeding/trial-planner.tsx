import { useCallback, useMemo, useRef, useState } from 'react';
import { Alert, RefreshControl, ScrollView, View } from 'react-native';

import { AddTrialSheet, type AddTrialSheetHandle } from '@/components/breeding/AddTrialSheet';
import { TrialPairingCard } from '@/components/breeding/TrialPairingCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useTrialPairings } from '@/hooks/useTrialPairings';

export default function TrialPlannerScreen() {
  const sheetRef = useRef<AddTrialSheetHandle>(null);
  const { trials, loading, error, refresh, addTrial, deleteTrial, promoteToPlan, resetAllTrials, calcCoi } =
    useTrialPairings();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const grouped = useMemo(() => {
    const map = new Map<number, typeof trials>();
    for (const trial of trials) {
      const gen = trial.trial_generation ?? trial.generation ?? 1;
      const list = map.get(gen) ?? [];
      list.push(trial);
      map.set(gen, list);
    }
    return [...map.entries()].sort(([a], [b]) => a - b);
  }, [trials]);

  const confirmReset = () => {
    Alert.alert('Reset all trials?', 'This will delete all trial pairings. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: () => void resetAllTrials() },
    ]);
  };

  return (
    <ScreenContainer scroll={false}>
      <PageHeader eyebrow="Breeding" title="Trial Mating Planner" />
      <View className="mx-6 mb-4 h-0.5 bg-gold" />

      <View className="flex-none px-6">
        <View className="mb-4 rounded-xl border border-gold/25 bg-gold/10 p-3">
          <Typography variant="caption" className="text-gold">
            ⚗ Sandbox mode — trials are not committed to the breeding programme.
          </Typography>
        </View>

        <View className="mb-4 flex-row flex-wrap gap-2">
          <Button label="+ Add Trial Pairing" size="sm" onPress={() => sheetRef.current?.open()} />
          <Button label="↺ Reset All" size="sm" variant="outline" onPress={confirmReset} />
        </View>
      </View>

      <View className="flex-1">
        {loading ? (
          <View className="px-6">
            <CardListSkeleton count={3} />
          </View>
        ) : error ? (
          <View className="px-6">
            <Typography variant="body" className="mb-3 text-danger">
              {error}
            </Typography>
            <Button label="Retry" variant="outline" size="sm" onPress={() => void refresh()} />
          </View>
        ) : (
          <ScrollView
            className="flex-1 px-6"
            contentContainerStyle={{ paddingBottom: 48 }}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor="#C4A35A" />}
          >
            {trials.length === 0 ? (
              <EmptyState
                title="No trial pairings yet"
                message="Add a trial to start planning future matings."
              />
            ) : (
              grouped.map(([gen, items]) => (
                <View key={gen} className="mb-4">
                  <Typography variant="label" className="mb-3 text-gold">
                    GEN {gen}
                  </Typography>
                  {items.map((trial) => (
                    <TrialPairingCard
                      key={trial.id}
                      trial={trial}
                      onDelete={deleteTrial}
                      onPromote={promoteToPlan}
                    />
                  ))}
                </View>
              ))
            )}
          </ScrollView>
        )}
      </View>

      <AddTrialSheet ref={sheetRef} onSaved={() => void refresh()} addTrial={addTrial} calcCoi={calcCoi} />
    </ScreenContainer>
  );
}
