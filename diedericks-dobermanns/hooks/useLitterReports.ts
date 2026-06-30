import { useCallback, useEffect, useState } from 'react';

import { requireSupabase, supabase } from '@/lib/supabase';

export interface LitterReportData {
  litter: {
    id: string;
    litter_letter: string | null;
    actual_date: string | null;
    male_count: number | null;
    female_count: number | null;
    deceased_count: number | null;
  };
  dam: { id: string; name: string; registration_number: string | null; date_of_birth: string | null } | null;
  sire: { id: string; name: string; registration_number: string | null; date_of_birth: string | null } | null;
  puppies: {
    id: string;
    name: string;
    sex: string | null;
    colour: string | null;
    microchip_number: string | null;
    status: string | null;
  }[];
}

export function useLitterReports(litterId: string) {
  const [data, setData] = useState<LitterReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!litterId || !supabase) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: row, error } = await requireSupabase()
      .from('litters')
      .select(
        `id, litter_letter, actual_date, male_count, female_count, deceased_count,
         mother:dogs!litters_mother_id_fkey(id, name, registration_number, date_of_birth),
         father:dogs!litters_father_id_fkey(id, name, registration_number, date_of_birth),
         puppies:dogs!dogs_litter_id_fkey(id, name, sex, colour, microchip_number, status)`,
      )
      .eq('id', litterId)
      .single();
    if (error || !row) {
      setData(null);
    } else {
      const r = row as Record<string, unknown>;
      const puppies = ((r.puppies as LitterReportData['puppies']) ?? []).filter(
        (p) => p.status !== 'deceased' && p.status !== 'stillborn',
      );
      setData({
        litter: {
          id: r.id as string,
          litter_letter: r.litter_letter as string | null,
          actual_date: r.actual_date as string | null,
          male_count: r.male_count as number | null,
          female_count: r.female_count as number | null,
          deceased_count: r.deceased_count as number | null,
        },
        dam: r.mother as LitterReportData['dam'],
        sire: r.father as LitterReportData['sire'],
        puppies,
      });
    }
    setLoading(false);
  }, [litterId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { data, loading, refresh };
}
