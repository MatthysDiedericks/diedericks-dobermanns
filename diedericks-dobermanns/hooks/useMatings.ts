import { useCallback, useEffect, useState } from 'react';

import { MATING_SELECT, type MatingRecord } from '@/lib/heats/constants';
import { whelpWindow, goHomeWindow } from '@/lib/dogs/whelpDates';
import { showError, showSaved } from '@/lib/dogDetail/feedback';
import { requireSupabase } from '@/lib/supabase';

async function refreshCycleWhelpDates(cycleId: string) {
  const client = requireSupabase();
  const { data: cycle } = await client
    .from('heat_cycles')
    .select('ovulation_date, mating_date, heat_start_date, expected_whelp_date')
    .eq('id', cycleId)
    .maybeSingle();
  if (!cycle) return;

  const { data: matings } = await client
    .from('matings')
    .select('mated_at')
    .eq('heat_cycle_id', cycleId)
    .order('mated_at', { ascending: false })
    .limit(1);
  const lastMating = matings?.[0]?.mated_at
    ? String(matings[0].mated_at).slice(0, 10)
    : null;

  const window = whelpWindow(
    cycle.ovulation_date,
    cycle.mating_date,
    cycle.expected_whelp_date,
    cycle.heat_start_date,
    lastMating,
  );
  const goHome = goHomeWindow(window.expected);
  await client
    .from('heat_cycles')
    .update({
      expected_whelp_date: window.expected,
      whelp_date_earliest: window.earliest,
      whelp_date_latest: window.latest,
      go_home_earliest: goHome.earliest,
      go_home_latest: goHome.latest,
    })
    .eq('id', cycleId);
}

export function useMatings(heatCycleId: string | null) {
  const [matings, setMatings] = useState<MatingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!heatCycleId) {
      setMatings([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await requireSupabase()
        .from('matings')
        .select(`${MATING_SELECT}, sire:dogs!matings_sire_id_fkey(id, name)`)
        .eq('heat_cycle_id', heatCycleId)
        .order('mated_at', { ascending: true });
      if (err) throw new Error(err.message);
      setMatings((data ?? []) as unknown as MatingRecord[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load matings');
      setMatings([]);
    } finally {
      setLoading(false);
    }
  }, [heatCycleId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addMating = useCallback(
    async (input: {
      mated_at: string;
      mating_type: string;
      sire_id?: string | null;
      external_sire_name?: string | null;
      tie_minutes?: number | null;
      notes?: string | null;
    }) => {
      if (!heatCycleId) throw new Error('No heat cycle');
      const client = requireSupabase();
      const {
        data: { user },
      } = await client.auth.getUser();
      const { error: err } = await client.from('matings').insert({
        heat_cycle_id: heatCycleId,
        mated_at: input.mated_at,
        mating_type: input.mating_type,
        sire_id: input.sire_id ?? null,
        external_sire_name: input.external_sire_name ?? null,
        tie_minutes: input.tie_minutes ?? null,
        notes: input.notes?.trim() || null,
        created_by: user?.id ?? null,
      });
      if (err) {
        showError(err.message);
        throw new Error(err.message);
      }
      // Status in_heat → mated is handled by sync_heat_cycle_from_matings.
      await refreshCycleWhelpDates(heatCycleId);
      showSaved();
      await refresh();
    },
    [heatCycleId, refresh],
  );

  const deleteMating = useCallback(
    async (id: string) => {
      if (!heatCycleId) return;
      const client = requireSupabase();
      const { error: err } = await client.from('matings').delete().eq('id', id);
      if (err) {
        showError(err.message);
        throw new Error(err.message);
      }
      // Last-mating → in_heat is handled by sync_heat_cycle_from_matings.
      await refreshCycleWhelpDates(heatCycleId);
      await refresh();
    },
    [heatCycleId, refresh],
  );

  return { matings, loading, error, refresh, addMating, deleteMating };
}
