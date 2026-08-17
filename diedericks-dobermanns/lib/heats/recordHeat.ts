import { HEAT_CYCLE_SELECT, type HeatCycleRecord } from '@/lib/heats/constants';
import {
  findPredictedWithinWindow,
  forecastVsActualMessage,
  pastHeatStatus,
} from '@/lib/heats/forecast';
import { requireSupabase } from '@/lib/supabase';
import type { TablesInsert } from '@/types/database.types';

export interface RecordHeatInput {
  dog_id: string;
  heat_start_date: string;
  heat_end_date?: string | null;
  notes?: string | null;
  mated?: boolean;
  status?: string;
}

export interface RecordHeatResult {
  offsetMessage?: string | null;
}

function offsetDays(predicted: string, actual: string): number {
  const a = new Date(`${actual}T00:00:00`).getTime();
  const p = new Date(`${predicted}T00:00:00`).getTime();
  return Math.round((a - p) / 86_400_000);
}

/** Insert an actual heat, or update a predicted row within ±45 days in place. */
export async function recordActualHeat(input: RecordHeatInput): Promise<RecordHeatResult> {
  const client = requireSupabase();
  const { data: rows, error: loadError } = await client
    .from('heat_cycles')
    .select(HEAT_CYCLE_SELECT)
    .eq('dog_id', input.dog_id);
  if (loadError) throw new Error(loadError.message);

  const cycles = (rows ?? []) as unknown as HeatCycleRecord[];
  const nearby = findPredictedWithinWindow(cycles, input.heat_start_date);
  const status = input.status ?? pastHeatStatus(input.heat_start_date, Boolean(input.mated));
  const payload = {
    dog_id: input.dog_id,
    heat_start_date: input.heat_start_date,
    heat_end_date: input.heat_end_date?.trim() || null,
    proestrus_start_date: input.heat_start_date,
    notes: input.notes?.trim() || null,
    is_predicted: false,
    status,
    cycle_confirmed_at: new Date().toISOString(),
  };

  if (nearby) {
    const { error } = await client
      .from('heat_cycles')
      .update({
        ...payload,
        ovulation_date: null,
        forecast_offset_days: offsetDays(nearby.heat_start_date, input.heat_start_date),
      })
      .eq('id', nearby.id);
    if (error) throw new Error(error.message);
    return {
      offsetMessage: forecastVsActualMessage(nearby.heat_start_date, input.heat_start_date),
    };
  }

  const { error } = await client
    .from('heat_cycles')
    .insert(payload as TablesInsert<'heat_cycles'>);
  if (error) throw new Error(error.message);
  return {};
}
