import { useCallback, useEffect, useState } from 'react';

import { requireSupabase } from '@/lib/supabase';

export type InlineLitterPuppy = {
  id: string;
  name: string;
  sex: string | null;
  status: string | null;
  collar_colour: string | null;
  reserved_for_name: string | null;
  new_owner_name: string | null;
  birth_order: number | null;
  deceased_at: string | null;
};

const INLINE_SELECT =
  'id, name, sex, status, collar_colour, reserved_for_name, new_owner_name, birth_order, deceased_at';

/** Fetch puppies for one litter only when that row is expanded. */
export function useLitterInlinePuppies(litterId: string, enabled: boolean) {
  const [puppies, setPuppies] = useState<InlineLitterPuppy[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled || !litterId) return;
    setError(null);
    try {
      const { data, error: err } = await requireSupabase()
        .from('dogs')
        .select(INLINE_SELECT)
        .eq('litter_id', litterId)
        .order('birth_order', { ascending: true, nullsFirst: false });
      if (err) throw new Error(err.message);
      setPuppies((data ?? []) as InlineLitterPuppy[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load puppies');
      setPuppies([]);
    }
  }, [enabled, litterId]);

  useEffect(() => {
    if (!enabled) return;
    if (puppies != null) return;
    void load();
  }, [enabled, load, puppies]);

  return { puppies, loading: enabled && puppies == null && !error, error };
}
