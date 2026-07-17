import { useCallback, useEffect, useState } from 'react';

import { requireSupabase, supabase } from '@/lib/supabase';

const ACTIVE_BREEDING_SELECT =
  'id, dog_id, sire_id, mating_date, expected_whelp_date, ovulation_date, status, ' +
  'dam:dogs!heat_cycles_dog_id_fkey(id, name), ' +
  'sire:dogs!heat_cycles_sire_id_fkey(id, name)';

export interface ActiveBreeding {
  id: string;
  damId: string;
  damName: string;
  sireId: string | null;
  sireName: string | null;
  matingDate: string;
  expectedWhelpDate: string | null;
  ovulationDate: string | null;
}

function mapRow(row: Record<string, unknown>): ActiveBreeding | null {
  const matingDate = row.mating_date as string | null;
  if (!matingDate) return null;
  const dam = row.dam as { id: string; name: string } | null;
  const sire = row.sire as { id: string; name: string } | null;
  if (!dam?.id) return null;
  return {
    id: row.id as string,
    damId: dam.id,
    damName: dam.name,
    sireId: (row.sire_id as string | null) ?? sire?.id ?? null,
    sireName: sire?.name ?? null,
    matingDate,
    expectedWhelpDate: (row.expected_whelp_date as string | null) ?? null,
    ovulationDate: (row.ovulation_date as string | null) ?? null,
  };
}

/**
 * Open breedings with a recorded mating and no litter linked yet — for the litter form picker.
 */
export function useActiveBreedings() {
  const [breedings, setBreedings] = useState<ActiveBreeding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!supabase) {
      setBreedings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const client = requireSupabase();
      const { data, error: err } = await client
        .from('heat_cycles')
        .select(ACTIVE_BREEDING_SELECT)
        .not('mating_date', 'is', null)
        .is('resulting_litter_id', null)
        .not('status', 'eq', 'no_outcome')
        .not('status', 'eq', 'cancelled')
        .not('status', 'eq', 'completed')
        .order('mating_date', { ascending: false });
      if (err) throw new Error(err.message);
      setBreedings(
        (data ?? [])
          .map((r) => mapRow(r as unknown as Record<string, unknown>))
          .filter(Boolean) as ActiveBreeding[],
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load breedings');
      setBreedings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { breedings, loading, error, refresh };
}
