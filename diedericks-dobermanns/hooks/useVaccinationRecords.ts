import { useCallback, useEffect, useState } from 'react';

import { DEWORMING_SELECT, VACCINATION_SELECT } from '@/lib/health/constants';
import { requireSupabase } from '@/lib/supabase';

export type VaccinationRecord = {
  id: string;
  title: string;
  date_administered: string;
  next_due_date: string | null;
  notes: string | null;
  administered_by: string | null;
};

export type DewormingRecord = {
  id: string;
  title: string;
  date_administered: string;
  next_due_date: string | null;
  notes: string | null;
  administered_by: string | null;
};

function mapVax(row: Record<string, unknown>): VaccinationRecord {
  return {
    id: String(row.id),
    title: String(row.vaccine_name ?? 'Vaccination'),
    date_administered: String(row.date_administered),
    next_due_date: (row.next_due_date as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    administered_by: (row.administered_by as string | null) ?? (row.doctor_name as string | null),
  };
}

function mapDeworm(row: Record<string, unknown>): DewormingRecord {
  return {
    id: String(row.id),
    title: String(row.product_name ?? row.treatment_type ?? 'Deworming'),
    date_administered: String(row.date_treated),
    next_due_date: (row.next_due_date as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    administered_by: (row.doctor_name as string | null) ?? null,
  };
}

export function useVaccinationRecords(dogId: string | undefined) {
  const [vaccinations, setVaccinations] = useState<VaccinationRecord[]>([]);
  const [deworming, setDeworming] = useState<DewormingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!dogId) {
      setVaccinations([]);
      setDeworming([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const supabase = requireSupabase();
      const [vRes, dRes] = await Promise.all([
        supabase
          .from('vaccinations')
          .select(VACCINATION_SELECT)
          .eq('dog_id', dogId)
          .order('date_administered', { ascending: false }),
        supabase
          .from('deworming_records')
          .select(DEWORMING_SELECT)
          .contains('dog_ids', [dogId])
          .order('date_treated', { ascending: false }),
      ]);
      if (vRes.error) throw new Error(vRes.error.message);
      if (dRes.error) throw new Error(dRes.error.message);
      setVaccinations((vRes.data ?? []).map((r) => mapVax(r as Record<string, unknown>)));
      setDeworming((dRes.data ?? []).map((r) => mapDeworm(r as Record<string, unknown>)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load health records');
      setVaccinations([]);
      setDeworming([]);
    } finally {
      setLoading(false);
    }
  }, [dogId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { vaccinations, deworming, loading, error, refresh };
}
