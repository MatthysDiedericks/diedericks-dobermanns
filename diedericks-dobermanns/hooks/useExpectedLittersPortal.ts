import { useCallback, useEffect, useState } from 'react';

import { goHomeWindow, whelpWindow } from '@/lib/dogs/whelpDates';
import { requireSupabase, supabase } from '@/lib/supabase';

const LITTER_SELECT =
  'id, name, status, expected_date, go_home_date, available_count, puppy_count, mating_date, mother_id, ' +
  'mother:dogs!litters_mother_id_fkey(name), father:dogs!litters_father_id_fkey(name)';

const BREEDING_SELECT =
  'id, dog_id, sire_id, mating_date, expected_whelp_date, ovulation_date, resulting_litter_id, ' +
  'dam:dogs!heat_cycles_dog_id_fkey(name), sire:dogs!heat_cycles_sire_id_fkey(name)';

export interface ExpectedLitterPortalItem {
  id: string;
  source: 'litter' | 'breeding';
  damName: string;
  sireName: string | null;
  headlineDue: string | null;
  whelpEarliest: string;
  whelpExpected: string;
  whelpLatest: string;
  goHomeEarliest: string;
  goHomeStandard: string;
  goHomeLatest: string;
  availableCount: number | null;
  puppyCount: number | null;
  status: string | null;
}

function litterKey(motherId: string | null, matingDate: string | null): string | null {
  if (!motherId || !matingDate) return null;
  return `${motherId}:${matingDate}`;
}

function mapLitter(row: Record<string, unknown>): ExpectedLitterPortalItem | null {
  const mother = row.mother as { name: string } | null;
  const father = row.father as { name: string } | null;
  const expected = (row.expected_date as string | null) ?? null;
  const mating = (row.mating_date as string | null) ?? null;
  const whelp = whelpWindow(null, mating, expected);
  const goHome = row.go_home_date
    ? {
        earliest: row.go_home_date as string,
        standard: row.go_home_date as string,
        latest: row.go_home_date as string,
      }
    : goHomeWindow(whelp.expected);
  return {
    id: row.id as string,
    source: 'litter',
    damName: mother?.name ?? 'Dam',
    sireName: father?.name ?? null,
    headlineDue: expected,
    whelpEarliest: whelp.earliest,
    whelpExpected: whelp.expected,
    whelpLatest: whelp.latest,
    goHomeEarliest: goHome.earliest,
    goHomeStandard: goHome.standard,
    goHomeLatest: goHome.latest,
    availableCount: (row.available_count as number | null) ?? null,
    puppyCount: (row.puppy_count as number | null) ?? null,
    status: (row.status as string | null) ?? null,
  };
}

function mapBreeding(row: Record<string, unknown>): ExpectedLitterPortalItem | null {
  const mating = row.mating_date as string | null;
  if (!mating) return null;
  const dam = row.dam as { name: string } | null;
  const sire = row.sire as { name: string } | null;
  const expected = (row.expected_whelp_date as string | null) ?? null;
  const ovulation = row.ovulation_date as string | null;
  const whelp = whelpWindow(ovulation, mating, expected);
  const computedGo = goHomeWindow(whelp.expected);
  return {
    id: row.id as string,
    source: 'breeding',
    damName: dam?.name ?? 'Dam',
    sireName: sire?.name ?? null,
    headlineDue: expected,
    whelpEarliest: whelp.earliest,
    whelpExpected: whelp.expected,
    whelpLatest: whelp.latest,
    goHomeEarliest: computedGo.earliest,
    goHomeStandard: computedGo.standard,
    goHomeLatest: computedGo.latest,
    availableCount: null,
    puppyCount: null,
    status: 'expected',
  };
}

/**
 * Public upcoming litters and open breedings for the client portal (read-only).
 */
export function useExpectedLittersPortal() {
  const [items, setItems] = useState<ExpectedLitterPortalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!supabase) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const client = requireSupabase();
      const [lRes, bRes] = await Promise.all([
        client
          .from('litters')
          .select(LITTER_SELECT)
          .eq('is_public', true)
          .in('status', ['planned', 'expected', 'born'])
          .order('expected_date', { ascending: true }),
        client
          .from('heat_cycles')
          .select(BREEDING_SELECT)
          .not('mating_date', 'is', null)
          .is('resulting_litter_id', null)
          .not('status', 'eq', 'no_outcome')
          .not('status', 'eq', 'cancelled')
          .not('status', 'eq', 'completed')
          .order('expected_whelp_date', { ascending: true }),
      ]);
      if (lRes.error) throw new Error(lRes.error.message);
      if (bRes.error) throw new Error(bRes.error.message);

      const litterItems = (lRes.data ?? [])
        .map((r) => mapLitter(r as unknown as Record<string, unknown>))
        .filter(Boolean) as ExpectedLitterPortalItem[];

      const litterKeys = new Set(
        (lRes.data ?? [])
          .map((r) => {
            const row = r as unknown as Record<string, unknown>;
            return litterKey(row.mother_id as string, row.mating_date as string);
          })
          .filter(Boolean),
      );

      const breedingItems = (bRes.data ?? [])
        .map((r) => {
          const row = r as unknown as Record<string, unknown>;
          const key = litterKey(row.dog_id as string, row.mating_date as string);
          if (key && litterKeys.has(key)) return null;
          return mapBreeding(row);
        })
        .filter(Boolean) as ExpectedLitterPortalItem[];

      setItems([...litterItems, ...breedingItems]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load expected litters');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { items, loading, error, refresh };
}
