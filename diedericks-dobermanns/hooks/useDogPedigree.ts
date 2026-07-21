import { useCallback, useEffect, useState } from 'react';

import { requireSupabase, supabase } from '@/lib/supabase';

const ANCESTOR_SELECT =
  'position, generation, registered_name, date_of_birth, wrights_coi, titles_health, own_ancestor_id';

export interface PedigreeAncestor {
  position: string;
  generation: number;
  registeredName: string | null;
  dateOfBirth: string | null;
  wrightsCoi: number | null;
  titlesHealth: string | null;
  ownAncestorId: string | null;
}

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

export function hasPedigreeAncestors(ancestors: PedigreeAncestor[]): boolean {
  return ancestors.some((a) => Boolean(a.registeredName?.trim()));
}

/**
 * Loads imported DogBreederPro pedigree rows for a dog plus its registered name / COI.
 */
export function useDogPedigree(dogId: string) {
  const [ancestors, setAncestors] = useState<PedigreeAncestor[]>([]);
  const [registeredName, setRegisteredName] = useState<string | null>(null);
  const [wrightsCoi, setWrightsCoi] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!dogId) {
      setAncestors([]);
      setLoading(false);
      return;
    }
    if (!supabase) {
      setAncestors([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const client = requireSupabase();
      const [dogRes, pedRes] = await Promise.all([
        client.from('dogs').select('registered_name, wrights_coi').eq('id', dogId).maybeSingle(),
        client
          .from('pedigree_ancestors' as never)
          .select(ANCESTOR_SELECT)
          .eq('dog_id' as never, dogId)
          .order('sort_order' as never),
      ]);

      if (dogRes.error) throw new Error(dogRes.error.message);
      if (pedRes.error) throw new Error(pedRes.error.message);

      const dogRow = dogRes.data as Record<string, unknown> | null;
      setRegisteredName((dogRow?.registered_name as string | null) ?? null);
      setWrightsCoi(
        dogRow?.wrights_coi != null ? Number(dogRow.wrights_coi) : null,
      );

      setAncestors(
        (pedRes.data ?? []).map((r) => mapAncestor(r as unknown as Record<string, unknown>)),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load pedigree');
      setAncestors([]);
    } finally {
      setLoading(false);
    }
  }, [dogId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { ancestors, registeredName, wrightsCoi, loading, error, refresh };
}
