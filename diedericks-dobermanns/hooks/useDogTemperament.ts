import { useCallback, useEffect, useState } from 'react';

import { requireSupabase, supabase } from '@/lib/supabase';
import type { TablesInsert } from '@/types/database.types';

export interface TemperamentScore {
  id: string;
  dog_id: string;
  assessed_by: string | null;
  assessed_at: string;
  evaluation_standard: 'fci_ztp' | 'akc_dpca';
  nerve_stability: number | null;
  drive_and_energy: number | null;
  courage: number | null;
  hardness: number | null;
  environmental_confidence: number | null;
  working_willingness: number | null;
  social_behavior: number | null;
  obedience: number | null;
  total_score: number | null;
  notes: string | null;
  created_at: string;
}

export type TemperamentScoreInput = Omit<
  TablesInsert<'dog_temperament_scores'>,
  'id' | 'total_score' | 'created_at'
>;

export function useDogTemperament(dogId: string) {
  const [scores, setScores] = useState<TemperamentScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!dogId || !supabase) {
      setScores([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await requireSupabase()
        .from('dog_temperament_scores')
        .select('*')
        .eq('dog_id', dogId)
        .order('assessed_at', { ascending: false });
      if (err) throw new Error(err.message);
      setScores((data ?? []) as TemperamentScore[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load temperament scores');
      setScores([]);
    } finally {
      setLoading(false);
    }
  }, [dogId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveScore = useCallback(
    async (payload: TemperamentScoreInput) => {
      const { error: err } = await requireSupabase().from('dog_temperament_scores').insert(payload);
      if (err) throw new Error(err.message);
      await refresh();
    },
    [refresh],
  );

  return { scores, loading, error, refresh, saveScore };
}
