import { useCallback, useEffect, useState } from 'react';

import {
  autoHeatDates,
  computeIsOverdue,
  daysSince,
  daysUntil,
  isActiveHeat,
  parseProgesteroneTests,
  withOverdueFlag,
  addDays,
} from '@/lib/heats/calculations';
import { notifyCalendarRefresh } from '@/lib/calendar/refresh';
import {
  BREED_DEFAULTS_SELECT,
  HEAT_CYCLE_SELECT,
  type BreedHeatDefaults,
  type FemaleHeatSummary,
  type HeatCycleRecord,
  type ProgesteroneTest,
} from '@/lib/heats/constants';
import { showError, showSaved } from '@/lib/dogDetail/feedback';
import { requireSupabase } from '@/lib/supabase';
import type { Json, TablesInsert, TablesUpdate } from '@/types/database.types';

const DOBERMANN_DEFAULTS: BreedHeatDefaults = {
  id: 'default',
  breed: 'Dobermann',
  avg_cycle_days: 180,
  ovulation_offset_days: 11,
  proestrus_days: 9,
  estrus_days: 7,
  diestrus_days: 75,
  anestrus_days: 89,
  gestation_days: 63,
};

function mapCycle(row: Record<string, unknown>): HeatCycleRecord {
  return withOverdueFlag({
    ...(row as unknown as HeatCycleRecord),
    progesterone_tests: parseProgesteroneTests(row.progesterone_tests),
    is_predicted: Boolean(row.is_predicted),
  });
}

export function useBreedDefaults() {
  const [defaults, setDefaults] = useState<BreedHeatDefaults>(DOBERMANN_DEFAULTS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await requireSupabase()
        .from('breed_heat_defaults')
        .select(BREED_DEFAULTS_SELECT)
        .ilike('breed', '%dober%')
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (data) setDefaults(data as BreedHeatDefaults);
    } catch {
      setDefaults(DOBERMANN_DEFAULTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { defaults, loading, refresh };
}

export function useHeatCyclesForDog(dogId: string) {
  const [cycles, setCycles] = useState<HeatCycleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!dogId) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await requireSupabase()
        .from('heat_cycles')
        .select(`${HEAT_CYCLE_SELECT}, sire:dogs!heat_cycles_sire_id_fkey(id, name)`)
        .eq('dog_id', dogId)
        .order('heat_start_date', { ascending: false });
      if (err) throw new Error(err.message);
      setCycles((data ?? []).map((r) => mapCycle(r as Record<string, unknown>)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load heat cycles');
      setCycles([]);
    } finally {
      setLoading(false);
    }
  }, [dogId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { cycles, loading, error, refresh };
}

export function useActiveHeat(dogId: string) {
  const { cycles, loading, error, refresh } = useHeatCyclesForDog(dogId);
  const active =
    cycles.find(isActiveHeat) ??
    cycles.find((c) => !c.is_predicted && c.status !== 'completed' && c.status !== 'skipped') ??
    null;
  return { heat: active, loading, error, refresh };
}

export function useNextPredictedHeat(dogId: string) {
  const { cycles, loading, error, refresh } = useHeatCyclesForDog(dogId);
  const predicted = cycles.filter((c) => c.is_predicted).sort((a, b) =>
    a.heat_start_date.localeCompare(b.heat_start_date),
  )[0] ?? null;
  return { predicted, loading, error, refresh };
}

export function useFemaleHeatSummaries() {
  const [summaries, setSummaries] = useState<FemaleHeatSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const client = requireSupabase();
      const { data: dogs, error: dErr } = await client
        .from('dogs')
        .select('id, name, dog_media(url, is_primary)')
        .eq('sex', 'female')
        .in('status', ['keep'])
        .order('name');
      if (dErr) throw new Error(dErr.message);

      const ids = (dogs ?? []).map((d) => d.id);
      if (ids.length === 0) {
        setSummaries([]);
        return;
      }

      const { data: heats, error: hErr } = await client
        .from('heat_cycles')
        .select(HEAT_CYCLE_SELECT)
        .in('dog_id', ids)
        .order('heat_start_date', { ascending: false });
      if (hErr) throw new Error(hErr.message);

      const byDog = new Map<string, HeatCycleRecord[]>();
      for (const row of heats ?? []) {
        const c = mapCycle(row as unknown as Record<string, unknown>);
        const arr = byDog.get(c.dog_id) ?? [];
        arr.push(c);
        byDog.set(c.dog_id, arr);
      }

      setSummaries(
        (dogs ?? []).map((dog) => {
          const media =
            (dog.dog_media as unknown as { url: string; is_primary: boolean }[] | null) ?? [];
          const photo =
            media.find((m) => m.is_primary)?.url ?? media[0]?.url ?? null;
          const cycles = byDog.get(dog.id) ?? [];
          const activeHeat = cycles.find(isActiveHeat) ?? null;
          const nextPredicted =
            cycles
              .filter((c) => c.is_predicted)
              .sort((a, b) => a.heat_start_date.localeCompare(b.heat_start_date))[0] ??
            null;
          const isOverdue = nextPredicted ? computeIsOverdue(nextPredicted) : false;
          return {
            id: dog.id,
            name: dog.name,
            photoUrl: photo,
            activeHeat,
            nextPredicted,
            isOverdue,
            daysInHeat: activeHeat ? daysSince(activeHeat.heat_start_date) : null,
            daysUntilNext: nextPredicted ? daysUntil(nextPredicted.heat_start_date) : null,
            daysOverdue:
              isOverdue && nextPredicted
                ? Math.abs(daysUntil(nextPredicted.heat_start_date) ?? 0)
                : null,
          };
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load heats');
      setSummaries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { summaries, loading, error, refresh };
}

export function useAddHeatCycle() {
  const { defaults } = useBreedDefaults();

  return useCallback(
    async (dogId: string, heatStart: string, extra?: Partial<HeatCycleRecord>) => {
      const client = requireSupabase();
      const auto = autoHeatDates(heatStart, defaults);
      const { error } = await client.from('heat_cycles').insert({
        dog_id: dogId,
        heat_start_date: heatStart,
        proestrus_start_date: extra?.proestrus_start_date ?? auto.proestrus_start_date,
        estrus_start_date: extra?.estrus_start_date ?? auto.estrus_start_date,
        ovulation_date: extra?.ovulation_date ?? auto.ovulation_date,
        expected_whelp_date: extra?.expected_whelp_date ?? auto.expected_whelp_date,
        heat_end_date: extra?.heat_end_date ?? null,
        status: extra?.status ?? 'active',
        is_predicted: false,
        notes: extra?.notes ?? null,
      } satisfies TablesInsert<'heat_cycles'>);
      if (error) {
        console.error('[useAddHeatCycle]', error.message);
        showError(error.message);
        throw new Error(error.message);
      }

      const { data: existingPredicted } = await client
        .from('heat_cycles')
        .select('id')
        .eq('dog_id', dogId)
        .eq('is_predicted', true)
        .gte('heat_start_date', heatStart)
        .limit(1);
      if (!existingPredicted?.length) {
        const nextStart = addDays(heatStart, defaults.avg_cycle_days);
        const nextAuto = autoHeatDates(nextStart, defaults);
        await client.from('heat_cycles').insert({
          dog_id: dogId,
          heat_start_date: nextStart,
          proestrus_start_date: nextAuto.proestrus_start_date,
          estrus_start_date: nextAuto.estrus_start_date,
          ovulation_date: nextAuto.ovulation_date,
          expected_whelp_date: nextAuto.expected_whelp_date,
          is_predicted: true,
          status: 'predicted',
        } satisfies TablesInsert<'heat_cycles'>);
      }

      showSaved();
      notifyCalendarRefresh();
    },
    [defaults],
  );
}

export function useUpdateHeatCycle() {
  return useCallback(async (id: string, patch: TablesUpdate<'heat_cycles'>) => {
    const { error } = await requireSupabase().from('heat_cycles').update(patch).eq('id', id);
    if (error) {
      console.error('[useUpdateHeatCycle]', error.message);
      showError();
      throw new Error(error.message);
    }
    showSaved();
  }, []);
}

export function useConfirmHeat() {
  return useCallback(async (id: string, actualStart: string, notes?: string) => {
    const { error } = await requireSupabase()
      .from('heat_cycles')
      .update({
        is_predicted: false,
        cycle_confirmed_at: new Date().toISOString(),
        heat_start_date: actualStart,
        status: 'active',
        notes: notes?.trim() || null,
      })
      .eq('id', id);
    if (error) {
      console.error('[useConfirmHeat]', error.message);
      showError();
      throw new Error(error.message);
    }
    showSaved();
  }, []);
}

export function useDeleteHeatCycle() {
  return useCallback(async (id: string) => {
    const { error } = await requireSupabase().from('heat_cycles').delete().eq('id', id);
    if (error) {
      console.error('[useDeleteHeatCycle]', error.message);
      showError();
      throw new Error(error.message);
    }
  }, []);
}

export function useAddProgesteroneTest() {
  const update = useUpdateHeatCycle();
  return useCallback(
    async (cycleId: string, existing: ProgesteroneTest[] | null, test: ProgesteroneTest) => {
      const next = [...(existing ?? []), test].sort((a, b) => a.date.localeCompare(b.date));
      await update(cycleId, { progesterone_tests: next as unknown as Json });
    },
    [update],
  );
}
