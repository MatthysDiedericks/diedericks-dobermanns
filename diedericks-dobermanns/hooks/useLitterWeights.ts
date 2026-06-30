import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  defaultSession,
  getWeighingSummary,
  type WeighingSession,
  type WeighingSummary,
} from '@/lib/litters/weighingSchedule';
import { requireSupabase, supabase } from '@/lib/supabase';

export interface LitterPuppy {
  id: string;
  name: string;
  sex: string | null;
  colour: string | null;
  collar_colour: string | null;
  birth_weight_grams: number | null;
}

export interface PuppyWeightLog {
  id: string;
  dog_id: string;
  weight_kg: number;
  recorded_date: string;
  recorded_at: string | null;
  session: WeighingSession | null;
  notes: string | null;
}

const PUPPY_SELECT =
  'id, name, sex, colour, collar_colour, birth_weight_grams' as const;
const LOG_SELECT =
  'id, dog_id, weight_kg, recorded_date, recorded_at, session, notes' as const;

export function useLitterWeights(litterId: string, whelpDate?: string | null) {
  const [puppies, setPuppies] = useState<LitterPuppy[]>([]);
  const [weightsByPuppyId, setWeightsByPuppyId] = useState<Map<string, PuppyWeightLog[]>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!litterId) return;
    setLoading(true);
    setError(null);
    if (!supabase) {
      setPuppies([]);
      setWeightsByPuppyId(new Map());
      setLoading(false);
      return;
    }
    try {
      const client = requireSupabase();
      const { data: puppyRows, error: pErr } = await client
        .from('dogs')
        .select(PUPPY_SELECT)
        .eq('litter_id', litterId)
        .order('name');
      if (pErr) throw new Error(pErr.message);
      const list = (puppyRows ?? []) as LitterPuppy[];
      setPuppies(list);

      if (list.length === 0) {
        setWeightsByPuppyId(new Map());
        return;
      }

      const ids = list.map((p) => p.id);
      const { data: logs, error: lErr } = await client
        .from('weight_logs')
        .select(LOG_SELECT)
        .in('dog_id', ids)
        .order('recorded_date', { ascending: true });
      if (lErr) throw new Error(lErr.message);

      const map = new Map<string, PuppyWeightLog[]>();
      for (const p of list) map.set(p.id, []);
      for (const row of (logs ?? []) as PuppyWeightLog[]) {
        const arr = map.get(row.dog_id) ?? [];
        arr.push(row);
        map.set(row.dog_id, arr);
      }
      setWeightsByPuppyId(map);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load weights');
      setPuppies([]);
      setWeightsByPuppyId(new Map());
    } finally {
      setLoading(false);
    }
  }, [litterId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const uniqueDates = useMemo(() => {
    const dates = new Set<string>();
    weightsByPuppyId.forEach((logs) => logs.forEach((l) => dates.add(l.recorded_date)));
    return [...dates].sort();
  }, [weightsByPuppyId]);

  const lastWeighedAt = useMemo(() => {
    let latest: Date | null = null;
    weightsByPuppyId.forEach((logs) =>
      logs.forEach((l) => {
        const at = l.recorded_at ? new Date(l.recorded_at) : new Date(l.recorded_date);
        if (!latest || at > latest) latest = at;
      }),
    );
    return latest;
  }, [weightsByPuppyId]);

  const weighingSummary: WeighingSummary = useMemo(
    () => getWeighingSummary(whelpDate ?? null, lastWeighedAt),
    [whelpDate, lastWeighedAt],
  );

  const logWeight = useCallback(
    async (
      puppyId: string,
      weightKg: number,
      date: string,
      session: WeighingSession = 'daily',
      recordedAt?: Date,
    ) => {
      const client = requireSupabase();
      const at = recordedAt ?? new Date();
      const { error: err } = await client.from('weight_logs').upsert(
        {
          dog_id: puppyId,
          weight_kg: weightKg,
          recorded_date: date,
          recorded_at: at.toISOString(),
          session,
        },
        { onConflict: 'dog_id,recorded_date,session' },
      );
      if (err) throw new Error(err.message);
      await refresh();
    },
    [refresh],
  );

  const logWeightsBatch = useCallback(
    async (
      entries: { puppyId: string; weightKg: number }[],
      session: WeighingSession,
      recordedAt: Date,
    ) => {
      const date = recordedAt.toISOString().slice(0, 10);
      const client = requireSupabase();
      const rows = entries.map((e) => ({
        dog_id: e.puppyId,
        weight_kg: e.weightKg,
        recorded_date: date,
        recorded_at: recordedAt.toISOString(),
        session,
      }));
      const { error: err } = await client
        .from('weight_logs')
        .upsert(rows, { onConflict: 'dog_id,recorded_date,session' });
      if (err) throw new Error(err.message);
      await refresh();
    },
    [refresh],
  );

  const deleteWeight = useCallback(
    async (weightLogId: string) => {
      const client = requireSupabase();
      const { error: err } = await client.from('weight_logs').delete().eq('id', weightLogId);
      if (err) throw new Error(err.message);
      await refresh();
    },
    [refresh],
  );

  return {
    puppies,
    weightsByPuppyId,
    uniqueDates,
    loading,
    error,
    refresh,
    logWeight,
    logWeightsBatch,
    deleteWeight,
    weighingSummary,
    defaultSession: defaultSession(),
  };
}

/** Parses weight input — values >100 treated as grams. */
export function parseWeightInput(raw: string): number | null {
  const n = parseFloat(raw.replace(',', '.').trim());
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n > 100) return n / 1000;
  return n;
}

export function gramsToKg(grams: number): number {
  return grams / 1000;
}
