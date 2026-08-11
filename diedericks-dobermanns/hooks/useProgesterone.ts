import { useCallback, useEffect, useState } from 'react';

import { goHomeWindow, whelpWindow } from '@/lib/dogs/whelpDates';
import { showError, showSaved } from '@/lib/dogDetail/feedback';
import { PROG_TEST_SELECT, type ProgTestRecord } from '@/lib/heats/constants';
import type { ProgUnit } from '@/lib/heats/progesterone';
import { requireSupabase } from '@/lib/supabase';

export function useProgesterone(heatCycleId: string | null, dogId?: string) {
  const [tests, setTests] = useState<ProgTestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [defaultUnit, setDefaultUnit] = useState<ProgUnit>('nmol_l');

  const refresh = useCallback(async () => {
    if (!heatCycleId) {
      setTests([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const client = requireSupabase();
      const { data, error: err } = await client
        .from('progesterone_tests')
        .select(PROG_TEST_SELECT)
        .eq('heat_cycle_id', heatCycleId)
        .order('tested_at', { ascending: true });
      if (err) throw new Error(err.message);
      setTests((data ?? []) as unknown as ProgTestRecord[]);

      if (dogId) {
        const { data: cycles } = await client
          .from('heat_cycles')
          .select('id')
          .eq('dog_id', dogId);
        const ids = (cycles ?? []).map((c) => c.id);
        if (ids.length) {
          const { data: last } = await client
            .from('progesterone_tests')
            .select('unit')
            .in('heat_cycle_id', ids)
            .order('tested_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (last?.unit === 'ng_ml' || last?.unit === 'nmol_l') {
            setDefaultUnit(last.unit);
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load progesterone');
      setTests([]);
    } finally {
      setLoading(false);
    }
  }, [heatCycleId, dogId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addReading = useCallback(
    async (input: {
      tested_at: string;
      value: number;
      unit: ProgUnit;
      test_phase?: 'ovulation_timing' | 'reverse';
      lab?: string | null;
      notes?: string | null;
      set_ovulation?: boolean;
      ovulation_date?: string | null;
    }) => {
      if (!heatCycleId) throw new Error('No heat cycle');
      const client = requireSupabase();
      const {
        data: { user },
      } = await client.auth.getUser();
      const { error: err } = await client.from('progesterone_tests').insert({
        heat_cycle_id: heatCycleId,
        tested_at: input.tested_at,
        value: input.value,
        unit: input.unit,
        test_phase: input.test_phase ?? 'ovulation_timing',
        lab: input.lab?.trim() || null,
        notes: input.notes?.trim() || null,
        created_by: user?.id ?? null,
      });
      if (err) {
        showError(err.message);
        throw new Error(err.message);
      }

      let whelpShiftDays: number | null = null;
      if (input.set_ovulation && input.ovulation_date) {
        const { data: before } = await client
          .from('heat_cycles')
          .select(
            'expected_whelp_date, ovulation_date, mating_date, heat_start_date',
          )
          .eq('id', heatCycleId)
          .maybeSingle();
        await client
          .from('heat_cycles')
          .update({ ovulation_date: input.ovulation_date })
          .eq('id', heatCycleId);
        const window = whelpWindow(
          input.ovulation_date,
          before?.mating_date,
          before?.expected_whelp_date,
          before?.heat_start_date,
        );
        const goHome = goHomeWindow(window.expected);
        await client
          .from('heat_cycles')
          .update({
            expected_whelp_date: window.expected,
            whelp_date_earliest: window.earliest,
            whelp_date_latest: window.latest,
            go_home_earliest: goHome.earliest,
            go_home_latest: goHome.latest,
          })
          .eq('id', heatCycleId);
        if (before?.expected_whelp_date) {
          const prev = new Date(before.expected_whelp_date).getTime();
          const next = new Date(window.expected).getTime();
          whelpShiftDays = Math.round((next - prev) / 86_400_000);
        }
      }

      showSaved();
      await refresh();
      return { whelpShiftDays };
    },
    [heatCycleId, refresh],
  );

  return { tests, loading, error, refresh, addReading, defaultUnit };
}
