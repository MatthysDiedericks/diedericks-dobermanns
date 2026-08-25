import { useCallback, useEffect, useState } from 'react';

import {
  hasPedigreeAncestors,
  useDogPedigree,
  type PedigreeAncestor,
} from '@/hooks/useDogPedigree';
import { pedigreeDisplayName } from '@/lib/dogs/pedigreeName';
import {
  countBySide,
  inheritPedigreeFromParents,
  parentHasPedigree,
  type ParentPedigree,
} from '@/lib/portal/inheritedPedigree';
import { requireSupabase } from '@/lib/supabase';

const ANCESTOR_SELECT =
  'position, generation, registered_name, date_of_birth, wrights_coi, titles_health, own_ancestor_id';

function mapAncestor(row: Record<string, unknown>): PedigreeAncestor {
  return {
    position: String(row.position ?? ''),
    generation: Number(row.generation ?? 0),
    registeredName: (row.registered_name as string | null) ?? null,
    dateOfBirth: (row.date_of_birth as string | null) ?? null,
    wrightsCoi: row.wrights_coi != null ? Number(row.wrights_coi) : null,
    titlesHealth: (row.titles_health as string | null) ?? null,
    ownAncestorId: (row.own_ancestor_id as string | null) ?? null,
  };
}

async function loadParent(id: string | null): Promise<ParentPedigree | null> {
  if (!id) return null;
  const client = requireSupabase();
  const [dogRes, pedRes] = await Promise.all([
    client.from('dogs').select('id, name, call_name, registered_name').eq('id', id).maybeSingle(),
    client
      .from('pedigree_ancestors' as never)
      .select(ANCESTOR_SELECT)
      .eq('dog_id' as never, id)
      .order('sort_order' as never),
  ]);
  if (!dogRes.data) return null;
  const dog = dogRes.data as {
    id: string;
    name: string;
    call_name: string | null;
    registered_name: string | null;
  };
  return {
    id: dog.id,
    name: dog.name,
    registeredName: dog.registered_name,
    callName: dog.call_name,
    ancestors: (pedRes.data ?? []).map((r) => mapAncestor(r as Record<string, unknown>)),
  };
}

async function resolveParentIds(dogId: string): Promise<{
  motherId: string | null;
  fatherId: string | null;
}> {
  const client = requireSupabase();
  const { data } = await client
    .from('dogs')
    .select('mother_id, father_id, litter_id')
    .eq('id', dogId)
    .maybeSingle();
  if (!data) return { motherId: null, fatherId: null };
  let motherId = data.mother_id ?? null;
  let fatherId = data.father_id ?? null;
  if ((!motherId || !fatherId) && data.litter_id) {
    const { data: litter } = await client
      .from('litters')
      .select('mother_id, father_id')
      .eq('id', data.litter_id)
      .maybeSingle();
    motherId = motherId ?? litter?.mother_id ?? null;
    fatherId = fatherId ?? litter?.father_id ?? null;
  }
  return { motherId, fatherId };
}

/** Pre-allocation: build a four-generation chart from the committed sire and dam. */
export function useInheritedPedigreeFromParents(
  parents: { id: string; role: 'sire' | 'dam'; name: string; registeredName: string | null; callName: string | null }[],
) {
  const sireId = parents.find((p) => p.role === 'sire')?.id ?? null;
  const damId = parents.find((p) => p.role === 'dam')?.id ?? null;
  const [ancestors, setAncestors] = useState<PedigreeAncestor[]>([]);
  const [sireMissing, setSireMissing] = useState<string | null>(null);
  const [damMissing, setDamMissing] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void Promise.all([loadParent(sireId), loadParent(damId)]).then(([sire, dam]) => {
      if (cancelled) return;
      setAncestors(inheritPedigreeFromParents(sire, dam));
      setSireMissing(
        sire && !parentHasPedigree(sire) ? sire.registeredName?.trim() || sire.name : null,
      );
      setDamMissing(
        dam && !parentHasPedigree(dam) ? dam.registeredName?.trim() || dam.name : null,
      );
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [sireId, damId]);

  return { ancestors, sireMissing, damMissing, loading };
}

export function useInheritedPedigree(dogId: string, fallbackName: string) {
  const own = useDogPedigree(dogId);
  const [inherited, setInherited] = useState<PedigreeAncestor[] | null>(null);
  const [sireMissing, setSireMissing] = useState<string | null>(null);
  const [damMissing, setDamMissing] = useState<string | null>(null);
  const [counts, setCounts] = useState({ sire: 0, dam: 0 });
  const [loadingParents, setLoadingParents] = useState(false);

  const loadInherited = useCallback(async () => {
    if (!dogId || hasPedigreeAncestors(own.ancestors) || own.loading) {
      setInherited(null);
      return;
    }
    setLoadingParents(true);
    try {
      const { motherId, fatherId } = await resolveParentIds(dogId);
      const [sire, dam] = await Promise.all([loadParent(fatherId), loadParent(motherId)]);
      const rows = inheritPedigreeFromParents(sire, dam);
      setInherited(rows);
      setCounts(countBySide(rows));
      setSireMissing(
        sire && !parentHasPedigree(sire)
          ? sire.registeredName?.trim() || sire.name
          : null,
      );
      setDamMissing(
        dam && !parentHasPedigree(dam) ? dam.registeredName?.trim() || dam.name : null,
      );
    } catch {
      setInherited([]);
    } finally {
      setLoadingParents(false);
    }
  }, [dogId, own.ancestors, own.loading]);

  useEffect(() => {
    void loadInherited();
  }, [loadInherited]);

  const ownHas = hasPedigreeAncestors(own.ancestors);
  const ancestors = ownHas ? own.ancestors : inherited ?? [];
  const displayName = pedigreeDisplayName({
    registeredName: own.registeredName,
    name: fallbackName,
  });

  return {
    ancestors,
    registeredName: own.registeredName,
    wrightsCoi: own.wrightsCoi,
    displayName,
    loading: own.loading || loadingParents,
    error: own.error,
    sireMissing,
    damMissing,
    counts: ownHas ? countBySide(own.ancestors) : counts,
    inherited: !ownHas,
  };
}
