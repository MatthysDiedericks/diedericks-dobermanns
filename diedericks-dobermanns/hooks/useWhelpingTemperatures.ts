import { useCallback, useEffect, useState } from 'react';

import { WHELP_TEMP_DROP_C, WHELP_TEMP_SELECT, type WhelpTempRecord } from '@/lib/heats/constants';
import { validateWhelpTempC, WHELP_TEMP_RANGE_MSG } from '@/lib/heats/whelpTempLogic';
import { sendNotification } from '@/lib/notifications';
import { getCachedUser } from '@/lib/auth/getCachedUser';
import { requireSupabase } from '@/lib/supabase';

const STAFF_ROLES = ['admin', 'super_admin', 'management'] as const;

async function notifyStaffOfTempDrop(input: {
  dogName: string;
  tempC: number;
  takenAt: string;
}): Promise<void> {
  const client = requireSupabase();
  const { data, error } = await client.from('users').select('id').in('role', [...STAFF_ROLES]);
  if (error) {
    console.error('[whelpTemps] staff lookup:', error.message);
    return;
  }
  const time = new Date(input.takenAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const subject = 'Whelping likely within 24 hours';
  const body = `${input.dogName}: temperature dropped to ${input.tempC.toFixed(1)} °C at ${time}.`;
  await Promise.all(
    (data ?? []).map((row) =>
      sendNotification({ recipientId: row.id, type: 'push', subject, body }),
    ),
  );
}

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
    async (input: {
      taken_at: string;
      temp_c: number;
      notes?: string | null;
      dogName?: string;
    }): Promise<{ error?: string; dropAlert?: boolean }> => {
      if (!heatCycleId) return { error: 'No heat cycle' };
      const rangeError = validateWhelpTempC(input.temp_c);
      if (rangeError) return { error: rangeError };

      const client = requireSupabase();
      const user = await getCachedUser();
      const { error: err } = await client.from('whelping_temperatures').insert({
        heat_cycle_id: heatCycleId,
        taken_at: input.taken_at,
        temp_c: input.temp_c,
        notes: input.notes?.trim() || null,
        created_by: user?.id ?? null,
      });
      if (err) {
        if (/temp_c|check|33|43/i.test(err.message)) {
          return { error: WHELP_TEMP_RANGE_MSG };
        }
        return { error: err.message };
      }

      const dropAlert = input.temp_c < WHELP_TEMP_DROP_C;
      if (dropAlert) {
        await notifyStaffOfTempDrop({
          dogName: input.dogName ?? 'Dam',
          tempC: input.temp_c,
          takenAt: input.taken_at,
        });
      }

      await refresh();
      return { dropAlert };
    },
    [heatCycleId, refresh],
  );

  return { temps, loading, error, refresh, addTemperature };
}
