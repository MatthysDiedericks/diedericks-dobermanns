import { useCallback, useEffect, useState } from 'react';

import { requireSupabase, supabase } from '@/lib/supabase';

export interface LitterIndexRow {
  id: string;
  name: string | null;
  litter_letter: string | null;
  status: string;
  actual_date: string | null;
  go_home_date: string | null;
  male_count: number | null;
  female_count: number | null;
  deceased_count: number | null;
  mother: { id: string; name: string } | null;
  father: { id: string; name: string } | null;
  puppies: {
    id: string;
    name: string;
    sex: string | null;
    colour: string | null;
    collar_colour: string | null;
    date_of_birth: string | null;
    status: string | null;
  }[];
}

const LITTER_INDEX_SELECT = `
  id, name, litter_letter, status, actual_date, go_home_date,
  male_count, female_count, deceased_count,
  mother:dogs!litters_mother_id_fkey(id, name),
  father:dogs!litters_father_id_fkey(id, name),
  puppies:dogs!dogs_litter_id_fkey(
    id, name, sex, colour, collar_colour, date_of_birth, status
  )
`;

const ACTIVE_STATUSES = new Set(['whelped', 'born', 'nursing', 'active']);

export function isActiveLitter(status: string): boolean {
  return ACTIVE_STATUSES.has(status.toLowerCase());
}

export function useLittersIndex() {
  const [litters, setLitters] = useState<LitterIndexRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!supabase) {
      setLitters([]);
      setLoading(false);
      return;
    }
    try {
      const { data, error: err } = await requireSupabase()
        .from('litters')
        .select(LITTER_INDEX_SELECT)
        .order('actual_date', { ascending: false, nullsFirst: false });
      if (err) throw new Error(err.message);
      setLitters((data ?? []) as unknown as LitterIndexRow[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load litters');
      setLitters([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const active = litters.filter((l) => isActiveLitter(l.status));
  const completed = litters.filter((l) => !isActiveLitter(l.status));

  return { litters, active, completed, loading, error, refresh };
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
