/** @deprecated Import from `@/hooks/useHeatCycles` instead. */
export {
  useHeatCyclesForDog,
  useFemaleHeatSummaries,
  useAddHeatCycle,
} from '@/hooks/useHeatCycles';

import { useCallback, useEffect, useState } from 'react';

import { useFemaleHeatSummaries } from '@/hooks/useHeatCycles';
import type { HeatCycleWithDog } from '@/types/kennel';

/** Legacy dashboard list — maps female summaries to flat heat rows. */
export function useHeats() {
  const { summaries, loading, error, refresh } = useFemaleHeatSummaries();
  const [heats, setHeats] = useState<HeatCycleWithDog[]>([]);

  useEffect(() => {
    const rows: HeatCycleWithDog[] = [];
    for (const s of summaries) {
      const cycle = s.activeHeat ?? s.nextPredicted;
      if (!cycle) continue;
      rows.push({
        ...cycle,
        dog_name: s.name,
        status: cycle.status as HeatCycleWithDog['status'],
      });
    }
    setHeats(rows);
  }, [summaries]);

  const recordHeat = useCallback(
    async (_dogId: string, _heatStart: string) => {
      await refresh();
    },
    [refresh],
  );

  return { heats, loading, error, refresh, recordHeat };
}
