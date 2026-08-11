import { useCallback, useEffect, useState } from 'react';

import { requireSupabase } from '@/lib/supabase';

export type OwnerHealthReport = {
  id: string;
  dog_id: string;
  check_in_id: string | null;
  reported_at: string;
  overall: string | null;
  weight_kg: number | null;
  dcm_screened: boolean | null;
  dcm_result: string | null;
  hips_elbows: string | null;
  conditions: string[] | null;
  died_at: string | null;
  age_at_death_months: number | null;
  cause_of_death: string | null;
  vet_practice: string | null;
  notes: string | null;
  created_at: string;
};

export function useOwnerHealthReports(dogId: string | null) {
  const [reports, setReports] = useState<OwnerHealthReport[]>([]);
  const [loading, setLoading] = useState(Boolean(dogId));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!dogId) {
      setReports([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await requireSupabase()
        .from('owner_health_reports')
        .select('*')
        .eq('dog_id', dogId)
        .order('reported_at', { ascending: false });
      if (err) throw new Error(err.message);
      setReports((data ?? []) as OwnerHealthReport[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load health reports');
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [dogId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { reports, loading, error, refresh };
}

export function useDogCheckInHistory(dogId: string | null) {
  const [items, setItems] = useState<
    Array<{
      id: string;
      kind: string;
      due_date: string;
      status: string;
      response_notes: string | null;
      sent_at: string | null;
      response_at: string | null;
    }>
  >([]);
  const [loading, setLoading] = useState(Boolean(dogId));
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!dogId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await requireSupabase()
        .from('check_ins')
        .select('id, kind, due_date, status, response_notes, sent_at, response_at')
        .eq('dog_id', dogId)
        .order('due_date', { ascending: false });
      if (err) throw new Error(err.message);
      setItems(data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load check-ins');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [dogId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { items, loading, error, refresh };
}
