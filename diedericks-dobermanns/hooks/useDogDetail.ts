import { useCallback, useEffect, useState } from 'react';

import { showError, showSaved } from '@/lib/dogDetail/feedback';
import { requireSupabase, supabase } from '@/lib/supabase';
import type {
  DogShow,
  HealthTest,
  MedicalCondition,
  WeightLog,
} from '@/types/app.types';
import type { TablesInsert } from '@/types/database.types';

const SHOW_SELECT =
  'id, dog_id, title, location, club, organisation, start_date, end_date, placement, award, notes';
const CONDITION_SELECT =
  'id, dog_id, condition_name, diagnosed_date, resolved_date, is_active, notes';
const WEIGHT_SELECT = 'id, dog_id, weight_kg, recorded_date, notes';
const TEST_SELECT =
  'id, dog_id, test_name, result, tested_date, lab, certificate_url, notes';

function useDogScopedList<T>(
  dogId: string,
  table: 'dog_shows' | 'medical_conditions' | 'weight_logs' | 'health_tests',
  select: string,
  order: { column: string; ascending: boolean },
) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!dogId) return;
    setLoading(true);
    setError(null);
    if (!supabase) {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data, error: err } = await requireSupabase()
      .from(table)
      .select(select)
      .eq('dog_id', dogId)
      .order(order.column, { ascending: order.ascending });
    if (err) {
      console.error(`[useDogDetail:${table}]`, err.message);
      setError(err.message);
      setItems([]);
    } else {
      setItems((data ?? []) as T[]);
    }
    setLoading(false);
  }, [dogId, table, select, order.column, order.ascending]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { items, loading, error, refresh };
}

export function useDogShows(dogId: string) {
  const { items: shows, loading, error, refresh } = useDogScopedList<DogShow>(
    dogId,
    'dog_shows',
    SHOW_SELECT,
    { column: 'start_date', ascending: false },
  );

  const addShow = useCallback(
    async (data: Omit<TablesInsert<'dog_shows'>, 'dog_id'>) => {
      if (!supabase) return;
      const { error: err } = await requireSupabase()
        .from('dog_shows')
        .insert({ ...data, dog_id: dogId });
      if (err) {
        console.error('[useDogShows]', err.message);
        showError();
        throw new Error(err.message);
      }
      showSaved();
      await refresh();
    },
    [dogId, refresh],
  );

  const deleteShow = useCallback(
    async (id: string) => {
      if (!supabase) return;
      const { error: err } = await requireSupabase().from('dog_shows').delete().eq('id', id);
      if (err) {
        console.error('[useDogShows]', err.message);
        showError();
        throw new Error(err.message);
      }
      await refresh();
    },
    [refresh],
  );

  return { shows, loading, error, refresh, addShow, deleteShow };
}

export function useMedicalConditions(dogId: string) {
  const { items: conditions, loading, error, refresh } =
    useDogScopedList<MedicalCondition>(dogId, 'medical_conditions', CONDITION_SELECT, {
      column: 'diagnosed_date',
      ascending: false,
    });

  const addCondition = useCallback(
    async (data: Omit<TablesInsert<'medical_conditions'>, 'dog_id'>) => {
      if (!supabase) return;
      const { error: err } = await requireSupabase()
        .from('medical_conditions')
        .insert({ ...data, dog_id: dogId, is_active: data.is_active ?? true });
      if (err) {
        console.error('[useMedicalConditions]', err.message);
        showError();
        throw new Error(err.message);
      }
      showSaved();
      await refresh();
    },
    [dogId, refresh],
  );

  const updateCondition = useCallback(
    async (id: string, data: Partial<TablesInsert<'medical_conditions'>>) => {
      if (!supabase) return;
      const { error: err } = await requireSupabase()
        .from('medical_conditions')
        .update(data)
        .eq('id', id);
      if (err) {
        console.error('[useMedicalConditions]', err.message);
        showError();
        throw new Error(err.message);
      }
      await refresh();
    },
    [refresh],
  );

  const deleteCondition = useCallback(
    async (id: string) => {
      if (!supabase) return;
      const { error: err } = await requireSupabase()
        .from('medical_conditions')
        .delete()
        .eq('id', id);
      if (err) {
        console.error('[useMedicalConditions]', err.message);
        showError();
        throw new Error(err.message);
      }
      await refresh();
    },
    [refresh],
  );

  return {
    conditions,
    loading,
    error,
    refresh,
    addCondition,
    updateCondition,
    deleteCondition,
  };
}

export function useWeightLogs(dogId: string) {
  const { items: logs, loading, error, refresh } = useDogScopedList<WeightLog>(
    dogId,
    'weight_logs',
    WEIGHT_SELECT,
    { column: 'recorded_date', ascending: false },
  );

  const addWeight = useCallback(
    async (weight_kg: number, recorded_date: string, notes?: string) => {
      if (!supabase) return;
      const { error: err } = await requireSupabase().from('weight_logs').insert({
        dog_id: dogId,
        weight_kg,
        recorded_date,
        notes: notes?.trim() || null,
      });
      if (err) {
        console.error('[useWeightLogs]', err.message);
        showError();
        throw new Error(err.message);
      }
      showSaved();
      await refresh();
    },
    [dogId, refresh],
  );

  const deleteWeight = useCallback(
    async (id: string) => {
      if (!supabase) return;
      const { error: err } = await requireSupabase().from('weight_logs').delete().eq('id', id);
      if (err) {
        console.error('[useWeightLogs]', err.message);
        showError();
        throw new Error(err.message);
      }
      await refresh();
    },
    [refresh],
  );

  return { logs, loading, error, refresh, addWeight, deleteWeight };
}

export function useHealthTests(dogId: string) {
  const { items: tests, loading, error, refresh } = useDogScopedList<HealthTest>(
    dogId,
    'health_tests',
    TEST_SELECT,
    { column: 'tested_date', ascending: false },
  );

  const addTest = useCallback(
    async (data: Omit<TablesInsert<'health_tests'>, 'dog_id'>) => {
      if (!supabase) return;
      const { error: err } = await requireSupabase()
        .from('health_tests')
        .insert({ ...data, dog_id: dogId });
      if (err) {
        console.error('[useHealthTests]', err.message);
        showError();
        throw new Error(err.message);
      }
      showSaved();
      await refresh();
    },
    [dogId, refresh],
  );

  const deleteTest = useCallback(
    async (id: string) => {
      if (!supabase) return;
      const { error: err } = await requireSupabase().from('health_tests').delete().eq('id', id);
      if (err) {
        console.error('[useHealthTests]', err.message);
        showError();
        throw new Error(err.message);
      }
      await refresh();
    },
    [refresh],
  );

  return { tests, loading, error, refresh, addTest, deleteTest };
}
