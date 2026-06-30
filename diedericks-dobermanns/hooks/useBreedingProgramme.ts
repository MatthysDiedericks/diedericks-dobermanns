import { useCallback, useEffect, useState } from 'react';

import { BREEDING_DOG_SELECT, PAIRING_SELECT } from '@/lib/breeding/constants';
import { checkProgrammeHealth } from '@/lib/breeding/programme-health';
import { seedBreedingProgrammeIfEmpty } from '@/lib/breeding/seed';
import { showError, showSaved } from '@/lib/dogDetail/feedback';
import { requireSupabase } from '@/lib/supabase';
import type { BreedingDog, BreedingLine, PairingRecord } from '@/types/breeding';
import type { TablesInsert, TablesUpdate } from '@/types/database.types';

function mapDog(row: Record<string, unknown>): BreedingDog {
  return {
    id: String(row.id),
    name: String(row.name),
    sex: (row.sex as string | null) ?? null,
    date_of_birth: (row.date_of_birth as string | null) ?? null,
    father_id: (row.father_id as string | null) ?? null,
    mother_id: (row.mother_id as string | null) ?? null,
    line: (row.line as BreedingDog['line']) ?? null,
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

function mapPairing(row: Record<string, unknown>): PairingRecord {
  const sire = row.sire as Record<string, unknown> | null;
  const dam = row.dam as Record<string, unknown> | null;
  return {
    id: String(row.id),
    sire_id: String(row.sire_id),
    dam_id: String(row.dam_id),
    line: row.line as PairingRecord['line'],
    generation: Number(row.generation ?? 1),
    status: row.status as PairingRecord['status'],
    priority: row.priority as PairingRecord['priority'],
    target_date: (row.target_date as string | null) ?? null,
    date_bred: (row.date_bred as string | null) ?? null,
    coi_estimate: (row.coi_estimate as number | null) ?? null,
    expected_litter_date: (row.expected_litter_date as string | null) ?? null,
    litter_id: (row.litter_id as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    sire: sire ? mapDog(sire) : null,
    dam: dam ? mapDog(dam) : null,
  };
}

export function useBreedingProgramme(generation = 1) {
  const [pairings, setPairings] = useState<PairingRecord[]>([]);
  const [breedingDogs, setBreedingDogs] = useState<BreedingDog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seeded, setSeeded] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const client = requireSupabase();

      if (!seeded) {
        const didSeed = await seedBreedingProgrammeIfEmpty();
        if (didSeed) setSeeded(true);
      }

      const [pairRes, dogRes] = await Promise.all([
        client
          .from('pairings')
          .select(PAIRING_SELECT)
          .eq('generation', generation)
          .neq('status', 'Trial')
          .order('priority'),
        client
          .from('dogs')
          .select(BREEDING_DOG_SELECT)
          .or('line.not.is.null,breeding_role.not.is.null,urgency_flag.eq.true')
          .order('name'),
      ]);

      if (pairRes.error) throw new Error(pairRes.error.message);
      if (dogRes.error) throw new Error(dogRes.error.message);

      setPairings((pairRes.data ?? []).map((r) => mapPairing(r as Record<string, unknown>)));
      setBreedingDogs((dogRes.data ?? []).map((r) => mapDog(r as Record<string, unknown>)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load breeding programme');
      setPairings([]);
      setBreedingDogs([]);
    } finally {
      setLoading(false);
    }
  }, [generation, seeded]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const urgentDams = breedingDogs.filter((d) => d.urgency_flag);
  const programmeHealth = checkProgrammeHealth(breedingDogs);

  return {
    pairings,
    breedingDogs,
    urgentDams,
    programmeHealth,
    loading,
    error,
    refresh,
  };
}

export function useBreedingDogs() {
  const [sires, setSires] = useState<BreedingDog[]>([]);
  const [dams, setDams] = useState<BreedingDog[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const client = requireSupabase();
      const { data, error: err } = await client
        .from('dogs')
        .select(BREEDING_DOG_SELECT)
        .in('status', ['keep', 'breeding_stock', 'stud'])
        .order('name');
      if (err) throw new Error(err.message);
      const dogs = (data ?? []).map((r) => mapDog(r as Record<string, unknown>));
      setSires(dogs.filter((d) => d.sex === 'male' && d.breeding_role !== 'Retired'));
      setDams(dogs.filter((d) => d.sex === 'female' && d.breeding_role !== 'Retired'));
    } catch {
      setSires([]);
      setDams([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { sires, dams, loading, refresh };
}

export function useAllPairings() {
  const [pairings, setPairings] = useState<PairingRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await requireSupabase()
        .from('pairings')
        .select(PAIRING_SELECT)
        .neq('status', 'Trial')
        .order('generation')
        .order('priority');
      if (error) throw new Error(error.message);
      setPairings((data ?? []).map((r) => mapPairing(r as Record<string, unknown>)));
    } catch {
      setPairings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { pairings, loading, refresh };
}

export function useSavePairing() {
  return useCallback(async (payload: TablesInsert<'pairings'>) => {
    const { error } = await requireSupabase().from('pairings').insert(payload);
    if (error) {
      showError(error.message);
      throw new Error(error.message);
    }
    showSaved();
  }, []);
}

export function useRecordLitterFromPairing() {
  return useCallback(
    async (input: {
      pairingId: string;
      whelpDate: string;
      puppyCount: number;
      maleCount: number;
      femaleCount: number;
      retainedMaleId?: string | null;
      retainedFemaleIds?: string[];
      retainedMaleLine?: BreedingDog['line'];
      retainedMaleGeneration?: number;
      retainedFemales?: { id: string; line: BreedingDog['line']; generation: number }[];
      litterName?: string;
    }) => {
      const client = requireSupabase();

      const { data: pairing, error: pErr } = await client
        .from('pairings')
        .select('sire_id, dam_id, line, generation')
        .eq('id', input.pairingId)
        .single();
      if (pErr) throw new Error(pErr.message);

      const { data: litter, error: lErr } = await client
        .from('litters')
        .insert({
          name: input.litterName ?? `Litter ${input.whelpDate}`,
          status: 'born',
          actual_date: input.whelpDate,
          expected_date: input.whelpDate,
          father_id: pairing.sire_id,
          mother_id: pairing.dam_id,
          pairing_id: input.pairingId,
          puppy_count: input.puppyCount,
          male_count: input.maleCount,
          female_count: input.femaleCount,
          retained_male_id: input.retainedMaleId ?? null,
          retained_female_ids: input.retainedFemaleIds ?? [],
        } satisfies TablesInsert<'litters'>)
        .select('id')
        .single();
      if (lErr) throw new Error(lErr.message);

      await client
        .from('pairings')
        .update({
          status: 'Completed',
          litter_id: litter.id,
          expected_litter_date: input.whelpDate,
        })
        .eq('id', input.pairingId);

      if (input.retainedMaleId && input.retainedMaleLine) {
        const dogPatch: TablesUpdate<'dogs'> = {
          line: input.retainedMaleLine,
          generation: input.retainedMaleGeneration ?? (pairing.generation ?? 1) + 1,
          breeding_role: 'Sire',
          origin_pairing_id: input.pairingId,
          status: 'keep',
          category: 'breeding_stock',
        };
        await client.from('dogs').update(dogPatch).eq('id', input.retainedMaleId);
      }

      for (const f of input.retainedFemales ?? []) {
        const femalePatch: TablesUpdate<'dogs'> = {
          line: f.line,
          generation: f.generation,
          breeding_role: 'Dam',
          origin_pairing_id: input.pairingId,
          status: 'keep',
          category: 'breeding_stock',
        };
        await client.from('dogs').update(femalePatch).eq('id', f.id);
      }

      showSaved();
      return litter.id as string;
    },
    [],
  );
}

export function useOrganogramDogs() {
  const [dogs, setDogs] = useState<BreedingDog[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await requireSupabase()
        .from('dogs')
        .select(BREEDING_DOG_SELECT)
        .not('line', 'is', null)
        .order('generation')
        .order('name');
      if (error) throw new Error(error.message);
      setDogs((data ?? []).map((r) => mapDog(r as Record<string, unknown>)));
    } catch {
      setDogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { dogs, loading, refresh };
}
