import { supabase } from '@/lib/supabase';
import {
  buildForwardStagePatch,
  buildQuoteCancelledFlag,
  isForwardStage,
} from '@/lib/waitlist/pipeline';
import type { TablesUpdate } from '@/types/database.types';
import { simulate, type MutationResult } from '@/lib/shared/mutationTypes';

/** Advance stage only forward. No-op (success) if already at/past target. */
export async function advanceWaitlistStage(
  id: string,
  nextStage: string,
  extra: Record<string, unknown> = {},
): Promise<MutationResult> {
  if (!supabase) return simulate();
  const { data: current, error: loadErr } = await supabase
    .from('waiting_list')
    .select('pipeline_stage')
    .eq('id', id)
    .single();
  if (loadErr) return { error: loadErr.message };
  if (!isForwardStage(current?.pipeline_stage, nextStage)) return { error: null };

  const { data: auth } = await supabase.auth.getUser();
  const patch = buildForwardStagePatch(current?.pipeline_stage, nextStage, auth.user?.id, extra);
  if (!patch) return { error: null };

  const { error } = await supabase
    .from('waiting_list')
    .update(patch as TablesUpdate<'waiting_list'>)
    .eq('id', id);
  return { error: error?.message ?? null };
}

/** Flag a cancelled quote — never reverse the pipeline stage. */
export async function flagWaitlistQuoteCancelled(quoteId: string): Promise<MutationResult> {
  if (!supabase) return simulate();
  const { data: entries, error } = await supabase
    .from('waiting_list')
    .select('id, internal_flags, admin_notes')
    .eq('quote_id', quoteId);
  if (error) return { error: error.message };
  for (const entry of entries ?? []) {
    const flag = buildQuoteCancelledFlag(entry.internal_flags, entry.admin_notes, quoteId);
    const { error: upErr } = await supabase
      .from('waiting_list')
      .update(flag as TablesUpdate<'waiting_list'>)
      .eq('id', entry.id);
    if (upErr) return { error: upErr.message };
  }
  return { error: null };
}
