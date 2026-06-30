import { useCallback, useEffect, useState } from 'react';

import { fetchPedigreeMap, resolveAncestors } from '@/lib/breeding/ancestors';
import { calculateCoi, type CoiResult } from '@/lib/breeding/coi';
import { PAIRING_SELECT } from '@/lib/breeding/constants';
import { showError, showSaved } from '@/lib/dogDetail/feedback';
import { requireSupabase } from '@/lib/supabase';
import type { BreedingDog, BreedingLine, PairingRecord } from '@/types/breeding';

export interface TrialPairing extends PairingRecord {
  trial_generation: number;
  trial_notes: string | null;
  coi_result?: CoiResult;
}

export interface NewTrialInput {
  sire_id: string;
  dam_id: string;
  line: 'A' | 'B' | 'Cross';
  trial_generation: number;
  target_date?: string | null;
  notes?: string | null;
  coi_estimate?: number | null;
}

const TRIAL_SELECT = `${PAIRING_SELECT.trim()}, trial_generation, trial_notes`;

function mapDog(row: Record<string, unknown>): BreedingDog {
  return {
    id: String(row.id),
    name: String(row.name),
    sex: (row.sex as string | null) ?? null,
    date_of_birth: (row.date_of_birth as string | null) ?? null,
    father_id: (row.father_id as string | null) ?? null,
    mother_id: (row.mother_id as string | null) ?? null,
    line: (row.line as BreedingLine | null) ?? null,
    generation: (row.generation as number | null) ?? null,
    breeding_role: (row.breeding_role as BreedingDog['breeding_role']) ?? null,
    urgency_flag: Boolean(row.urgency_flag),
    health_dcm1: (row.health_dcm1 as BreedingDog['health_dcm1']) ?? null,
    health_dcm2: (row.health_dcm2 as BreedingDog['health_dcm2']) ?? null,
    health_dcm3: (row.health_dcm3 as BreedingDog['health_dcm3']) ?? null,
    health_dcm4: (row.health_dcm4 as BreedingDog['health_dcm4']) ?? null,
    health_dcm5: (row.health_dcm5 as BreedingDog['health_dcm5']) ?? null,
    health_hd: (row.health_hd as BreedingDog['health_hd']) ?? null,
    health_ed: (row.health_ed as BreedingDog['health_ed']) ?? null,
    holter_date: (row.holter_date as string | null) ?? null,
    holter_result: (row.holter_result as BreedingDog['holter_result']) ?? null,
    wrights_coi: (row.wrights_coi as number | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    origin_pairing_id: (row.origin_pairing_id as string | null) ?? null,
    status: String(row.status ?? 'keep'),
  };
}

function mapTrial(row: Record<string, unknown>): TrialPairing {
  const sire = row.sire as Record<string, unknown> | null;
  const dam = row.dam as Record<string, unknown> | null;
  return {
    id: String(row.id),
    sire_id: String(row.sire_id),
    dam_id: String(row.dam_id),
    line: row.line as TrialPairing['line'],
    generation: Number(row.generation ?? 1),
    status: row.status as TrialPairing['status'],
    priority: row.priority as TrialPairing['priority'],
    target_date: (row.target_date as string | null) ?? null,
    date_bred: (row.date_bred as string | null) ?? null,
    coi_estimate: (row.coi_estimate as number | null) ?? null,
    expected_litter_date: (row.expected_litter_date as string | null) ?? null,
    litter_id: (row.litter_id as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    trial_generation: Number(row.trial_generation ?? row.generation ?? 1),
    trial_notes: (row.trial_notes as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    sire: sire ? mapDog(sire) : null,
    dam: dam ? mapDog(dam) : null,
  };
}

export function useTrialPairings() {
  const [trials, setTrials] = useState<TrialPairing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrials = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const sb = requireSupabase();
      const { data, error: err } = await sb
        .from('pairings')
        .select(TRIAL_SELECT)
        .eq('status', 'Trial')
        .order('trial_generation', { ascending: true })
        .order('created_at', { ascending: true });
      if (err) throw err;
      setTrials((data ?? []).map((r) => mapTrial(r as unknown as Record<string, unknown>)));
    } catch (e) {
      setError('Could not load trial pairings.');
      console.error('[useTrialPairings]', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTrials();
  }, [fetchTrials]);

  const addTrial = useCallback(
    async (input: NewTrialInput) => {
      try {
        const sb = requireSupabase();
        const { error: err } = await sb.from('pairings').insert({
          sire_id: input.sire_id,
          dam_id: input.dam_id,
          line: input.line,
          generation: input.trial_generation,
          trial_generation: input.trial_generation,
          trial_notes: input.notes ?? null,
          status: 'Trial',
          priority: 'Future',
          target_date: input.target_date ?? null,
          coi_estimate: input.coi_estimate ?? null,
          notes: input.notes ?? null,
        });
        if (err) throw err;
        showSaved('Trial pairing added');
        await fetchTrials();
      } catch (e) {
        showError('Could not save trial pairing.');
        console.error('[useTrialPairings.addTrial]', e);
      }
    },
    [fetchTrials],
  );

  const deleteTrial = useCallback(async (id: string) => {
    try {
      const sb = requireSupabase();
      const { error: err } = await sb.from('pairings').delete().eq('id', id).eq('status', 'Trial');
      if (err) throw err;
      setTrials((prev) => prev.filter((t) => t.id !== id));
    } catch (e) {
      showError('Could not remove trial.');
      console.error('[useTrialPairings.deleteTrial]', e);
    }
  }, []);

  const promoteToPlan = useCallback(
    async (id: string) => {
      try {
        const sb = requireSupabase();
        const { error: err } = await sb
          .from('pairings')
          .update({ status: 'Planned', priority: 'Future' })
          .eq('id', id)
          .eq('status', 'Trial');
        if (err) throw err;
        showSaved('Pairing promoted to Planned');
        await fetchTrials();
      } catch (e) {
        showError('Could not promote pairing.');
        console.error('[useTrialPairings.promoteToPlan]', e);
      }
    },
    [fetchTrials],
  );

  const resetAllTrials = useCallback(async () => {
    try {
      const sb = requireSupabase();
      const { error: err } = await sb.from('pairings').delete().eq('status', 'Trial');
      if (err) throw err;
      setTrials([]);
      showSaved('All trial pairings cleared');
    } catch (e) {
      showError('Could not reset trials.');
      console.error('[useTrialPairings.resetAllTrials]', e);
    }
  }, []);

  const calcCoi = useCallback(async (sireId: string, damId: string): Promise<CoiResult | null> => {
    try {
      const pedigree = await fetchPedigreeMap();
      const [sireAnc, damAnc] = await Promise.all([
        resolveAncestors(sireId, pedigree),
        resolveAncestors(damId, pedigree),
      ]);
      return calculateCoi(sireAnc, damAnc);
    } catch (e) {
      console.error('[useTrialPairings.calcCoi]', e);
      return null;
    }
  }, []);

  return {
    trials,
    loading,
    error,
    refresh: fetchTrials,
    addTrial,
    deleteTrial,
    promoteToPlan,
    resetAllTrials,
    calcCoi,
  };
}
