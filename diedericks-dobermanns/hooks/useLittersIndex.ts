import { useCallback, useEffect, useState } from 'react';

import {
  buildDerivedCountsByLitter,
  type DerivedLitterCount,
  type PuppyCountSlice,
} from '@/lib/litters/derivedCounts';
import { requireSupabase, supabase } from '@/lib/supabase';

export interface LitterIndexRow {
  id: string;
  name: string | null;
  litter_letter: string | null;
  status: string;
  actual_date: string | null;
  expected_date: string | null;
  go_home_date: string | null;
  male_count: number | null;
  female_count: number | null;
  deceased_count: number | null;
  puppy_count: number | null;
  available_count: number | null;
  mother_id: string | null;
  mother: { id: string; name: string } | null;
  father: { id: string; name: string } | null;
}

const LITTER_INDEX_SELECT = `
  id, name, litter_letter, status, actual_date, expected_date, go_home_date, mother_id,
  male_count, female_count, deceased_count, puppy_count, available_count,
  mother:dogs!litters_mother_id_fkey(id, name),
  father:dogs!litters_father_id_fkey(id, name)
`;

const PUPPY_SLICE_SELECT =
  'litter_id, status, owner_id, reserved_for_name, new_owner_name';

const ACTIVE_STATUSES = new Set(['whelped', 'born', 'nursing', 'active']);

export function isActiveLitter(status: string): boolean {
  return ACTIVE_STATUSES.has(status.toLowerCase());
}

export function useLittersIndex() {
  const [litters, setLitters] = useState<LitterIndexRow[]>([]);
  const [countsByLitterId, setCountsByLitterId] = useState<
    Record<string, DerivedLitterCount>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!supabase) {
      setLitters([]);
      setCountsByLitterId({});
      setLoading(false);
      return;
    }
    try {
      const client = requireSupabase();
      const [{ data, error: err }, { data: slices, error: sliceErr }] =
        await Promise.all([
          client.from('litters').select(LITTER_INDEX_SELECT),
          client.from('dogs').select(PUPPY_SLICE_SELECT).not('litter_id', 'is', null),
        ]);
      if (err) throw new Error(err.message);
      if (sliceErr) throw new Error(sliceErr.message);
      const rows = (data ?? []) as unknown as LitterIndexRow[];
      setLitters(rows);
      setCountsByLitterId(
        buildDerivedCountsByLitter((slices ?? []) as PuppyCountSlice[], rows),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load litters');
      setLitters([]);
      setCountsByLitterId({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const active = litters.filter((l) => isActiveLitter(l.status));
  const completed = litters.filter((l) => !isActiveLitter(l.status));

  return { litters, countsByLitterId, active, completed, loading, error, refresh };
}

export interface FemaleLitterHistoryRow {
  id: string;
  actual_date: string | null;
  litter_letter: string | null;
  male_count: number | null;
  female_count: number | null;
  deceased_count: number | null;
  notes: string | null;
  whelping_notes: string | null;
  father: { id: string; name: string } | null;
  puppies: { id: string; name: string; sex: string | null }[];
}

export function useFemaleLitterHistory(femaleId?: string) {
  const [rows, setRows] = useState<FemaleLitterHistoryRow[]>([]);
  const [females, setFemales] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!supabase) {
      setRows([]);
      setFemales([]);
      setLoading(false);
      return;
    }
    try {
      const client = requireSupabase();
      const { data: femaleRows } = await client
        .from('dogs')
        .select('id, name')
        .eq('sex', 'female')
        .in('status', ['keep', 'active'])
        .order('name');
      setFemales((femaleRows ?? []) as { id: string; name: string }[]);

      let q = client
        .from('litters')
        .select(
          `id, actual_date, litter_letter, male_count, female_count, deceased_count, notes, whelping_notes,
           father:dogs!litters_father_id_fkey(id, name),
           puppies:dogs!dogs_litter_id_fkey(id, name, sex)`,
        )
        .order('actual_date', { ascending: false });
      if (femaleId) q = q.eq('mother_id', femaleId);
      const { data, error: err } = await q;
      if (err) throw new Error(err.message);
      setRows((data ?? []) as unknown as FemaleLitterHistoryRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load history');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [femaleId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const summary = {
    litters: rows.length,
    puppies: rows.reduce((s, r) => s + (r.male_count ?? 0) + (r.female_count ?? 0), 0),
    deceased: rows.reduce((s, r) => s + (r.deceased_count ?? 0), 0),
  };

  return { rows, females, summary, loading, error, refresh };
}
