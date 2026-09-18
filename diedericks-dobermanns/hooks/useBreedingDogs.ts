import { useCallback, useEffect, useState } from 'react';

import { applyActiveKennelStockFilter } from '@/lib/dogs/status';
import { requireSupabase, supabase } from '@/lib/supabase';

export interface BreedingDog {
  id: string;
  name: string;
  sex: string | null;
  colour: string | null;
  registration_number: string | null;
  status: string | null;
  deceased_at: string | null;
}

const PARENT_SELECT =
  'id, name, sex, colour, registration_number, status, deceased_at';

function asDogs(data: unknown): BreedingDog[] {
  return (data ?? []) as BreedingDog[];
}

/**
 * The generated Postgrest types explode when the kennel-stock helper infers
 * T from a full filter builder. The helper still runs; we just stop the
 * compiler walking that tree.
 */
function kennelStock<Q>(query: Q): Q {
  return applyActiveKennelStockFilter(query as never) as Q;
}

export function useBreedingDogs() {
  const [females, setFemales] = useState<BreedingDog[]>([]);
  const [males, setMales] = useState<BreedingDog[]>([]);
  const [historicalDams, setHistoricalDams] = useState<BreedingDog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const client = requireSupabase();
      const [damRes, sireRes, histRes] = await Promise.all([
        kennelStock(client.from('dogs').select(PARENT_SELECT))
          .eq('sex', 'female')
          .order('name'),
        kennelStock(client.from('dogs').select(PARENT_SELECT))
          .eq('sex', 'male')
          .in('status', ['stud', 'keep'])
          .order('name'),
        client
          .from('dogs')
          .select(PARENT_SELECT)
          .eq('sex', 'female')
          .or('status.eq.retired,status.eq.deceased,not.deceased_at.is.null')
          .order('name'),
      ]);
      if (damRes.error) throw damRes.error;
      if (sireRes.error) throw sireRes.error;
      if (histRes.error) throw histRes.error;
      const dams = asDogs(damRes.data);
      const damIds = new Set(dams.map((d) => d.id));
      setFemales(dams);
      setMales(asDogs(sireRes.data));
      setHistoricalDams(asDogs(histRes.data).filter((d) => !damIds.has(d.id)));
    } catch {
      setFemales([]);
      setMales([]);
      setHistoricalDams([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return { females, males, historicalDams, loading };
}
