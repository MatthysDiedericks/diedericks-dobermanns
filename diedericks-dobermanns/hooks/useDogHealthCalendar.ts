import { useCallback, useEffect, useState } from 'react';

import {
  buildHealthCalendar,
  type DewormingLike,
  type HealthCalendar,
  type VaccinationLike,
} from '@/lib/dogs/healthCalendar';
import { requireSupabase } from '@/lib/supabase';

const VAX_SELECT =
  'id, vaccine_name, date_administered, next_due_date, administered_by, doctor_name';
const WORM_SELECT =
  'id, product_name, treatment_date, next_due_date, administered_by, doctor_name';

export function useDogHealthCalendar(dogId: string) {
  const [calendar, setCalendar] = useState<HealthCalendar>({ upcoming: [], history: [] });
  const [vaccinationsCount, setVaccinationsCount] = useState(0);
  const [dewormingCount, setDewormingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!dogId) return;
    setLoading(true);
    try {
      const client = requireSupabase();
      const [vax, worm] = await Promise.all([
        client.from('vaccinations').select(VAX_SELECT).eq('dog_id', dogId).order('date_administered', { ascending: false }),
        client
          .from('deworming_records')
          .select(WORM_SELECT)
          .eq('dog_id', dogId)
          .order('treatment_date', { ascending: false }),
      ]);
      const vaccinations = (vax.data ?? []) as VaccinationLike[];
      const deworming = (worm.data ?? []) as DewormingLike[];
      setVaccinationsCount(vaccinations.length);
      setDewormingCount(deworming.length);
      setCalendar(buildHealthCalendar(vaccinations, deworming));
    } catch {
      setCalendar({ upcoming: [], history: [] });
    } finally {
      setLoading(false);
    }
  }, [dogId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { calendar, vaccinationsCount, dewormingCount, loading, refresh };
}
