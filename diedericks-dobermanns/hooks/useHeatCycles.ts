import { useCallback, useEffect, useState } from 'react';

import {
  isActiveHeat,
  parseProgesteroneTests,
  withOverdueFlag,
} from '@/lib/heats/calculations';
import { notifyCalendarRefresh } from '@/lib/calendar/refresh';
import {
  BREED_DEFAULTS_SELECT,
  DOBERMANN_DEFAULTS,
  HEAT_CYCLE_SELECT,
  type BreedHeatDefaults,
  type FemaleHeatSummary,
  type HeatCycleRecord,
  type ProgesteroneTest,
} from '@/lib/heats/constants';
import { recordActualHeat } from '@/lib/heats/recordHeat';
import { buildFemaleHeatSummary, sortBreedingFemales } from '@/lib/heats/summaries';
import { showError, showSaved } from '@/lib/dogDetail/feedback';
import { profilePhotoUrl } from '@/lib/dogs/profilePhoto';
import { requireSupabase } from '@/lib/supabase';
import type { Json, TablesUpdate } from '@/types/database.types';

function mapCycle(row: Record<string, unknown>): HeatCycleRecord {
  return withOverdueFlag({
    ...(row as unknown as HeatCycleRecord),
    progesterone_tests: parseProgesteroneTests(row.progesterone_tests),
    is_predicted: Boolean(row.is_predicted),
    whelp_date_locked: Boolean(row.whelp_date_locked),
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
        .select('id, name, date_of_birth, dog_media(url, thumbnail_url, is_primary, uploaded_at)')
        .eq('sex', 'female')
        .or('category.eq.breeding_stock,status.eq.breeding_stock,status.eq.stud,status.eq.keep')
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

      const { data: defaultsRow } = await client
        .from('breed_heat_defaults')
        .select(BREED_DEFAULTS_SELECT)
        .ilike('breed', '%dober%')
        .limit(1)
        .maybeSingle();
      const defaults = (defaultsRow as BreedHeatDefaults | null) ?? DOBERMANN_DEFAULTS;

      const byDog = new Map<string, HeatCycleRecord[]>();
      for (const row of heats ?? []) {
        const c = mapCycle(row as unknown as Record<string, unknown>);
        const arr = byDog.get(c.dog_id) ?? [];
        arr.push(c);
        byDog.set(c.dog_id, arr);
      }

      const litterIds = [
        ...new Set(
          (heats ?? [])
            .map((h) => (h as { resulting_litter_id?: string | null }).resulting_litter_id)
            .filter((id): id is string => Boolean(id)),
        ),
      ];
      const litterGoHome: Record<string, string | null> = {};
      if (litterIds.length) {
        const { data: litters } = await client
          .from('litters')
          .select('id, go_home_date')
          .in('id', litterIds);
        for (const row of litters ?? []) {
          litterGoHome[row.id] = row.go_home_date;
        }
      }

      setSummaries(
        sortBreedingFemales(
          (dogs ?? []).map((dog) => {
            const photo = profilePhotoUrl(
              (dog.dog_media as unknown as {
                url: string;
                is_primary: boolean;
                thumbnail_url?: string | null;
                uploaded_at?: string | null;
              }[] | null) ?? [],
            );
            return buildFemaleHeatSummary(
              {
                id: dog.id,
                name: dog.name,
                photoUrl: photo,
                dateOfBirth: (dog as { date_of_birth?: string | null }).date_of_birth,
              },
              byDog.get(dog.id) ?? [],
              defaults,
              litterGoHome,
            );
          }),
        ),
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
  return useCallback(
    async (
      dogId: string,
      heatStart: string,
      extra?: Partial<HeatCycleRecord> & { mated?: boolean },
    ) => {
      try {
        const result = await recordActualHeat({
          dog_id: dogId,
          heat_start_date: heatStart,
          heat_end_date: extra?.heat_end_date,
          notes: extra?.notes,
          mated: extra?.mated,
          status: extra?.status,
        });
        showSaved(result.offsetMessage ?? undefined);
        notifyCalendarRefresh();
        return result;
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Could not save heat cycle.';
        console.error('[useAddHeatCycle]', message);
        showError(message);
        throw e;
      }
    },
    [],
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
    const client = requireSupabase();
    const { data: existing } = await client
      .from('heat_cycles')
      .select('heat_start_date, is_predicted')
      .eq('id', id)
      .maybeSingle();
    const predictedStart = existing?.is_predicted ? existing.heat_start_date : null;
    const offset =
      predictedStart != null
        ? Math.round(
            (new Date(`${actualStart}T00:00:00`).getTime() -
              new Date(`${predictedStart}T00:00:00`).getTime()) /
              86_400_000,
          )
        : null;
    const { error } = await client
      .from('heat_cycles')
      .update({
        is_predicted: false,
        cycle_confirmed_at: new Date().toISOString(),
        heat_start_date: actualStart,
        status: 'in_heat',
        notes: notes?.trim() || null,
        ovulation_date: null,
        forecast_offset_days: offset,
      })
      .eq('id', id);
    if (error) {
      console.error('[useConfirmHeat]', error.message);
      showError();
      throw new Error(error.message);
    }
    const message =
      offset == null || offset === 0
        ? undefined
        : offset < 0
          ? `Came into season ${Math.abs(offset)} days earlier than forecast — forecast updated.`
          : `Came into season ${offset} days later than forecast — forecast updated.`;
    showSaved(message);
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
