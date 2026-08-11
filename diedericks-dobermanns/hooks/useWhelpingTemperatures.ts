import { useCallback, useEffect, useState } from 'react';

import {
  WHELP_TEMP_DROP_C,
  WHELP_TEMP_SELECT,
  type WhelpTempRecord,
} from '@/lib/heats/constants';
import { showError, showSaved } from '@/lib/dogDetail/feedback';
import { broadcastNotification } from '@/lib/notifications';
import { requireSupabase } from '@/lib/supabase';

export function useWhelpingTemperatures(heatCycleId: string | null) {
  const [temps, setTemps] = useState<WhelpTempRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!heatCycleId) {
      setTemps([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await requireSupabase()
        .from('whelping_temperatures')
        .select(WHELP_TEMP_SELECT)
        .eq('heat_cycle_id', heatCycleId)
        .order('taken_at', { ascending: true });
      if (err) throw new Error(err.message);
      setTemps((data ?? []) as unknown as WhelpTempRecord[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load temperatures');
      setTemps([]);
    } finally {
      setLoading(false);
    }
  }, [heatCycleId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addTemperature = useCallback(
    async (input: { taken_at: string; temp_c: number; notes?: string | null; dogName?: string }) => {
      if (!heatCycleId) throw new Error('No heat cycle');
      const client = requireSupabase();
      const {
        data: { user },
      } = await client.auth.getUser();
      const { error: err } = await client.from('whelping_temperatures').insert({
        heat_cycle_id: heatCycleId,
        taken_at: input.taken_at,
        temp_c: input.temp_c,
        notes: input.notes?.trim() || null,
        created_by: user?.id ?? null,
      });
      if (err) {
        showError(err.message);
        throw new Error(err.message);
      }
      showSaved();

      if (input.temp_c < WHELP_TEMP_DROP_C) {
        const time = new Date(input.taken_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
        await broadcastNotification({
          type: 'push',
          subject: 'Whelping likely within 24 hours',
          body: `${input.dogName ?? 'Dam'}: temperature dropped to ${input.temp_c.toFixed(1)} °C at ${time}.`,
        });
      }

      await refresh();
      return { dropAlert: input.temp_c < WHELP_TEMP_DROP_C };
    },
    [heatCycleId, refresh],
  );

  return { temps, loading, error, refresh, addTemperature };
}
