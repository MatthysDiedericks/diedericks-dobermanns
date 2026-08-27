import { useCallback, useEffect, useMemo, useState } from 'react';

import { coiResultFromEstimate, type CoiResult } from '@/lib/breeding/coi';
import {
  BREEDING_DOG_SELECT,
  PAIRING_SELECT,
  PLANNER_FEMALE_FILTER,
  PLANNER_MALE_FILTER,
} from '@/lib/breeding/constants';
import { evaluatePairing } from '@/lib/breeding/evaluatePairing';
import { seedBreedingProgrammeIfEmpty } from '@/lib/breeding/seed';
import { showError, showSaved } from '@/lib/dogDetail/feedback';
import { profilePhotoUrl } from '@/lib/dogs/profilePhoto';
import { requireSupabase } from '@/lib/supabase';
import type {
  BreedingLine,
  FemaleAllocation,
  PairingRecord,
  PairingWithCoi,
  PlannerDog,
} from '@/types/breeding';
import type { TablesInsert } from '@/types/database.types';

const LINE_ORDER: Record<string, number> = { A: 0, B: 1, Cross: 2, Unknown: 3 };

function photoFromRow(row: Record<string, unknown>): string | null {
  const media = (row.dog_media as { url: string; is_primary: boolean; thumbnail_url?: string | null; uploaded_at?: string | null }[] | null) ?? [];
  return profilePhotoUrl(media);
}

function mapPlannerDog(row: Record<string, unknown>): PlannerDog {
  return {
    id: String(row.id),
    name: String(row.name),
    call_name: (row.call_name as string | null) ?? null,
    sex: (row.sex as string | null) ?? null,
    date_of_birth: (row.date_of_birth as string | null) ?? null,
    father_id: (row.father_id as string | null) ?? null,
    mother_id: (row.mother_id as string | null) ?? null,
    line: (row.line as PlannerDog['line']) ?? null,
    generation: (row.generation as number | null) ?? null,
    breeding_role: (row.breeding_role as PlannerDog['breeding_role']) ?? null,
    urgency_flag: Boolean(row.urgency_flag),
    health_dcm1: (row.health_dcm1 as PlannerDog['health_dcm1']) ?? null,
    health_dcm2: (row.health_dcm2 as PlannerDog['health_dcm2']) ?? null,
    health_dcm3: (row.health_dcm3 as PlannerDog['health_dcm3']) ?? null,
    health_dcm4: (row.health_dcm4 as PlannerDog['health_dcm4']) ?? null,
    health_dcm5: (row.health_dcm5 as PlannerDog['health_dcm5']) ?? null,
    health_hd: (row.health_hd as PlannerDog['health_hd']) ?? null,
    health_ed: (row.health_ed as PlannerDog['health_ed']) ?? null,
    holter_date: (row.holter_date as string | null) ?? null,
    holter_result: (row.holter_result as PlannerDog['holter_result']) ?? null,
    wrights_coi: (row.wrights_coi as number | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    origin_pairing_id: (row.origin_pairing_id as string | null) ?? null,
    status: String(row.status ?? 'keep'),
    photo_url: photoFromRow(row),
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
    sire: sire ? mapPlannerDog(sire) : null,
    dam: dam ? mapPlannerDog(dam) : null,
  };
}

function sortByLine(a: PlannerDog, b: PlannerDog): number {
  const la = LINE_ORDER[a.line ?? 'Unknown'] ?? 99;
  const lb = LINE_ORDER[b.line ?? 'Unknown'] ?? 99;
  if (la !== lb) return la - lb;
  return a.name.localeCompare(b.name);
}

function isLockedFemale(dog: PlannerDog): boolean {
  return (
    dog.name.toLowerCase().includes('hannah') ||
    Boolean(dog.notes?.toLowerCase().includes('cannot breed in gen 1'))
  );
}

/**
 * Always asks the `evaluate_pairing` RPC for a fresh COI — no more trusting a
 * possibly-stale stored value, since the RPC is now the single source of
 * truth for the calculation (see PARITY PROMPT 4).
 *
 * Returns null when the RPC has no pedigree ancestor data for one or both
 * dogs — callers must render that as "COI not available", never as 0%.
 */
async function coiForPairing(sireId: string, damId: string): Promise<CoiResult | null> {
  const evaluation = await evaluatePairing(sireId, damId);
  if (evaluation?.coiEstimate == null) return null;
  return coiResultFromEstimate(evaluation.coiEstimate);
}

export function useBreedingPlanner(generation = 1) {
  const [males, setMales] = useState<PlannerDog[]>([]);
  const [females, setFemales] = useState<PlannerDog[]>([]);
  const [pairings, setPairings] = useState<PairingWithCoi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const client = requireSupabase();
      await seedBreedingProgrammeIfEmpty();

      const [maleRes, femaleRes, pairRes] = await Promise.all([
        client
          .from('dogs')
          .select(BREEDING_DOG_SELECT)
          .eq('sex', 'male')
          .in('status', [...PLANNER_MALE_FILTER])
          .or('breeding_role.in.(Sire,Both,Prospect),line.in.(A,B,Cross)')
          .order('name'),
        client
          .from('dogs')
          .select(BREEDING_DOG_SELECT)
          .eq('sex', 'female')
          .in('status', [...PLANNER_FEMALE_FILTER])
          .or('breeding_role.in.(Dam,Both,Prospect),line.in.(A,B,Cross),urgency_flag.eq.true')
          .order('name'),
        client
          .from('pairings')
          .select(PAIRING_SELECT)
          .eq('generation', generation)
          .neq('status', 'Trial')
          .order('priority'),
      ]);

      if (maleRes.error) throw new Error(maleRes.error.message);
      if (femaleRes.error) throw new Error(femaleRes.error.message);
      if (pairRes.error) throw new Error(pairRes.error.message);

      const maleList = (maleRes.data ?? [])
        .map((r) => mapPlannerDog(r as Record<string, unknown>))
        .sort(sortByLine);
      const femaleList = (femaleRes.data ?? []).map((r) =>
        mapPlannerDog(r as Record<string, unknown>),
      );

      const rawPairings = (pairRes.data ?? []).map((r) => mapPairing(r as Record<string, unknown>));
      const withCoi: PairingWithCoi[] = [];

      for (const p of rawPairings) {
        const coi = await coiForPairing(p.sire_id, p.dam_id);
        const coiValue = coi?.coi ?? null;
        const needsUpdate =
          coiValue == null
            ? p.coi_estimate != null
            : p.coi_estimate == null || Math.abs(p.coi_estimate - coiValue) > 0.01;
        if (needsUpdate) {
          await client.from('pairings').update({ coi_estimate: coiValue }).eq('id', p.id);
        }
        withCoi.push({ ...p, coi });
      }

      setMales(maleList);
      setFemales(femaleList);
      setPairings(withCoi);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load breeding planner');
      setMales([]);
      setFemales([]);
      setPairings([]);
    } finally {
      setLoading(false);
    }
  }, [generation]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const femalesByMale = useMemo(() => {
    const map = new Map<string, FemaleAllocation[]>();
    for (const p of pairings) {
      if (p.status === 'Cancelled') continue;
      const dam =
        females.find((f) => f.id === p.dam_id) ??
        (p.dam as PlannerDog | undefined) ??
        null;
      if (!dam) continue;
      const arr = map.get(p.sire_id) ?? [];
      arr.push({ female: dam, pairing: p });
      map.set(p.sire_id, arr);
    }
    return map;
  }, [pairings, females]);

  const assignedDamIds = useMemo(
    () => new Set(pairings.filter((p) => p.status !== 'Cancelled').map((p) => p.dam_id)),
    [pairings],
  );

  const unassignedFemales = useMemo(
    () => females.filter((f) => !assignedDamIds.has(f.id)),
    [females, assignedDamIds],
  );

  const previewCoi = useCallback(async (sireId: string, damId: string): Promise<CoiResult | null> => {
    return coiForPairing(sireId, damId);
  }, []);

  const savePairing = useCallback(
    async (payload: TablesInsert<'pairings'>) => {
      const coi = await coiForPairing(String(payload.sire_id), String(payload.dam_id));
      const { error: err } = await requireSupabase()
        .from('pairings')
        .insert({ ...payload, coi_estimate: coi?.coi ?? null });
      if (err) {
        showError(err.message);
        throw new Error(err.message);
      }
      showSaved();
      await refresh();
    },
    [refresh],
  );

  const updatePairing = useCallback(
    async (id: string, patch: { sire_id?: string; status?: string; date_bred?: string }) => {
      const existing = pairings.find((p) => p.id === id);
      const sireId = patch.sire_id ?? existing?.sire_id;
      const damId = existing?.dam_id;
      let coiVal: number | null = existing?.coi?.coi ?? null;
      if (sireId && damId && patch.sire_id) {
        coiVal = (await coiForPairing(sireId, damId))?.coi ?? null;
      }
      const { error: err } = await requireSupabase()
        .from('pairings')
        .update({ ...patch, coi_estimate: coiVal })
        .eq('id', id);
      if (err) {
        showError(err.message);
        throw new Error(err.message);
      }
      showSaved();
      await refresh();
    },
    [pairings, refresh],
  );

  return {
    males,
    females,
    pairings,
    femalesByMale,
    unassignedFemales,
    previewCoi,
    savePairing,
    updatePairing,
    isLockedFemale,
    loading,
    error,
    refresh,
  };
}

