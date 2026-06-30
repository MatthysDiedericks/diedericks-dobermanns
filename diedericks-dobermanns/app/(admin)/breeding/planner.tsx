import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  View,
} from 'react-native';

import {
  AllocateSireSheet,
  type AllocateSireSheetHandle,
} from '@/components/breeding/AllocateSireSheet';
import { CoiInfoPanel, type CoiInfoPanelHandle } from '@/components/breeding/CoiInfoPanel';
import { FemaleCard } from '@/components/breeding/FemaleCard';
import { MaleColumn } from '@/components/breeding/MaleColumn';
import {
  PairingDetailSheet,
  type PairingDetailSheetHandle,
} from '@/components/breeding/PairingDetailSheet';
import { buildLineSegments, PlannerLines } from '@/components/breeding/PlannerLines';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useBreedingPlanner } from '@/hooks/useBreedingPlanner';
import { COLUMN_MAX_VISIBLE, COLUMN_MIN_WIDTH } from '@/lib/breeding/constants';
import type { CardLayout, PairingWithCoi, PlannerDog } from '@/types/breeding';

export default function BreedingPlannerScreen() {
  const router = useRouter();
  const {
    males,
    pairings,
    femalesByMale,
    unassignedFemales,
    isLockedFemale,
    savePairing,
    updatePairing,
    loading,
    error,
    refresh,
  } = useBreedingPlanner(1);

  const coiInfoRef = useRef<CoiInfoPanelHandle>(null);
  const allocateRef = useRef<AllocateSireSheetHandle>(null);
  const detailRef = useRef<PairingDetailSheetHandle>(null);
  const positionsRef = useRef<Map<string, CardLayout>>(new Map());
  const [layoutTick, setLayoutTick] = useState(0);
  const [canvasHeight, setCanvasHeight] = useState(600);

  const screenWidth = Dimensions.get('window').width;
  const columnWidth = Math.max(
    COLUMN_MIN_WIDTH,
    screenWidth / Math.min(Math.max(males.length, 1), COLUMN_MAX_VISIBLE),
  );
  const canvasWidth = Math.max(screenWidth, columnWidth * males.length + 32);

  const registerLayout = useCallback((key: string, layout: CardLayout) => {
    positionsRef.current.set(key, layout);
    setLayoutTick((t) => t + 1);
  }, []);

  const segments = useMemo(
    () => buildLineSegments(pairings, positionsRef.current),
    [pairings, layoutTick],
  );

  const openFemale = useCallback(
    (female: PlannerDog, pairing?: PairingWithCoi) => {
      if (pairing) {
        detailRef.current?.open(pairing);
        return;
      }
      allocateRef.current?.open(female, males, pairing);
    },
    [males],
  );

  const onSaveAllocation = useCallback(
    async (femaleId: string, sireId: string, line: PlannerDog['line'], existingId?: string) => {
      if (existingId) {
        await updatePairing(existingId, { sire_id: sireId });
        return;
      }
      await savePairing({
        sire_id: sireId,
        dam_id: femaleId,
        line: line ?? 'A',
        generation: 1,
        status: 'Planned',
        priority: 'Active',
      });
    },
    [savePairing, updatePairing],
  );

  return (
    <ScreenContainer scroll={false}>
      <View className="flex-row items-start justify-between px-6">
        <View className="flex-1">
          <PageHeader eyebrow="Genetic Programme" title="Visual Breeding Planner" />
        </View>
        <View className="mt-2 flex-row gap-2">
          <Pressable
            onPress={() => {
              const first = unassignedFemales[0];
              if (first) allocateRef.current?.open(first, males);
            }}
            className="rounded-full border border-gold/40 px-3 py-2"
          >
            <Typography variant="caption" className="text-gold">
              + PAIR
            </Typography>
          </Pressable>
          <Pressable onPress={() => coiInfoRef.current?.open()} className="rounded-full border border-gold/40 px-3 py-2">
            <Typography variant="caption" className="text-gold">
              ⚙ INFO
            </Typography>
          </Pressable>
        </View>
      </View>

      {error ? (
        <Typography variant="body" className="px-6 text-danger">
          {error}
        </Typography>
      ) : null}

      {loading ? (
        <View className="px-6">
          <CardListSkeleton count={3} />
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 48 }}>
          <View
            onLayout={(e) => setCanvasHeight(e.nativeEvent.layout.height)}
            style={{ minHeight: 480 }}
          >
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ width: canvasWidth, flexDirection: 'row', paddingVertical: 16 }}>
                {males.map((male, index) => (
                  <MaleColumn
                    key={male.id}
                    male={male}
                    columnWidth={columnWidth}
                    columnX={index * columnWidth}
                    allocations={femalesByMale.get(male.id) ?? []}
                    isLockedFemale={isLockedFemale}
                    onFemalePress={openFemale}
                    onRegisterLayout={registerLayout}
                  />
                ))}
              </View>
            </ScrollView>
            <PlannerLines width={canvasWidth} height={canvasHeight} segments={segments} />
          </View>

          {unassignedFemales.length > 0 ? (
            <View className="px-6 pt-4">
              <Typography variant="label" className="mb-3 text-gold">
                UNASSIGNED DAMS
              </Typography>
              <FlatList
                data={unassignedFemales}
                scrollEnabled={false}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <FemaleCard
                    female={item}
                    locked={isLockedFemale(item)}
                    onPress={() => openFemale(item)}
                    onLayout={(layout) =>
                      registerLayout(`dam-${item.id}`, { ...layout, x: layout.x + 24, y: layout.y })
                    }
                  />
                )}
              />
            </View>
          ) : null}

          <View className="px-6 pt-4">
            <Button label="Refresh planner" variant="ghost" onPress={() => void refresh()} />
          </View>
        </ScrollView>
      )}

      <CoiInfoPanel ref={coiInfoRef} />
      <AllocateSireSheet ref={allocateRef} pairings={pairings} onSave={onSaveAllocation} />
      <PairingDetailSheet
        ref={detailRef}
        onRecordMating={(id, date) => updatePairing(id, { status: 'Active', date_bred: date })}
        onRecordLitter={(id) =>
          router.push({ pathname: '/(admin)/breeding/litter-recorder', params: { pairingId: id } } as never)
        }
      />
    </ScreenContainer>
  );
}
