import { useEffect, useState } from 'react';

import { requireSupabase, supabase } from '@/lib/supabase';

/**
 * Search puppies by name or microchip without loading every litter's pups
 * on the list. Returns matching litter ids, or null when there is no query.
 */
export function useLitterPuppySearch(query: string) {
  const [litterIds, setLitterIds] = useState<string[] | null>(null);

  useEffect(() => {
    const raw = query.trim();
    if (!raw) {
      setLitterIds(null);
      return;
    }
    const safe = raw.replace(/[%_,()]/g, '').slice(0, 40);
    if (!safe || !supabase) {
      setLitterIds([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const client = requireSupabase();
        const [{ data: byName }, { data: byChip }] = await Promise.all([
          client
            .from('dogs')
            .select('litter_id')
            .not('litter_id', 'is', null)
            .ilike('name', `%${safe}%`),
          client
            .from('dogs')
            .select('litter_id')
            .not('litter_id', 'is', null)
            .ilike('microchip_number', `%${safe}%`),
        ]);
        if (cancelled) return;
        const ids = new Set<string>();
        for (const row of [...(byName ?? []), ...(byChip ?? [])]) {
          if (row.litter_id) ids.add(row.litter_id);
        }
        setLitterIds([...ids]);
      } catch {
        if (!cancelled) setLitterIds([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [query]);

  return litterIds;
}
