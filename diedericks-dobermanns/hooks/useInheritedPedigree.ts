import { useCallback, useEffect, useState } from 'react';

import { hasPedigreeAncestors, type PedigreeAncestor } from '@/hooks/useDogPedigree';
import { requireSupabase } from '@/lib/supabase';
import {
  inheritPedigreeFromParents,
  parentHasPedigree,
  type ParentPedigree,
} from '@/lib/portal/inheritedPedigree';
import type { LineageParent } from '@/hooks/useCommittedBreeding';

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

async function loadParentPedigree(parent: LineageParent): Promise<ParentPedigree> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from('pedigree_ancestors' as never)
    .select(ANCESTOR_SELECT)
    .eq('dog_id' as never, parent.id)
    .order('sort_order' as never);
  if (error) throw new Error(error.message);
  return {
    id: parent.id,
    name: parent.name,
    registeredName: parent.registeredName,
    ancestors: (data ?? []).map((r) => mapAncestor(r as unknown as Record<string, unknown>)),
  };
}

export function useInheritedPedigree(parents: LineageParent[]) {
  const [ancestors, setAncestors] = useState<PedigreeAncestor[]>([]);
  const [sireMissing, setSireMissing] = useState(false);
  const [damMissing, setDamMissing] = useState(false);
  const [sireCount, setSireCount] = useState(0);
  const [damCount, setDamCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const sire = parents.find((p) => p.role === 'sire') ?? null;
    const dam = parents.find((p) => p.role === 'dam') ?? null;
    if (!sire && !dam) {
      setAncestors([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [sirePed, damPed] = await Promise.all([
        sire ? loadParentPedigree(sire) : Promise.resolve(null),
        dam ? loadParentPedigree(dam) : Promise.resolve(null),
      ]);
      setSireCount(sirePed?.ancestors.length ?? 0);
      setDamCount(damPed?.ancestors.length ?? 0);
      setSireMissing(Boolean(sire) && !parentHasPedigree(sirePed));
      setDamMissing(Boolean(dam) && !parentHasPedigree(damPed));
      setAncestors(inheritPedigreeFromParents(sirePed, damPed));
    } catch (e) {
      console.error('[useInheritedPedigree]', e);
      setAncestors([]);
    } finally {
      setLoading(false);
    }
  }, [parents]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    ancestors,
    hasData: hasPedigreeAncestors(ancestors),
    sireMissing,
    damMissing,
    sireCount,
    damCount,
    loading,
    refresh,
  };
}
