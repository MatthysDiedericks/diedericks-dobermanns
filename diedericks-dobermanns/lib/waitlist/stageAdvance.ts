import { getCachedUser } from '@/lib/auth/getCachedUser';
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

  const user = await getCachedUser();
  const patch = buildForwardStagePatch(current?.pipeline_stage, nextStage, user?.id, extra);
  if (!patch) return { error: null };

  const { error } = await supabase
    .from('waiting_list')
    .update(patch as TablesUpdate<'waiting_list'>)
    .eq('id', id);
  return { error: error?.message ?? null };
}

/** Advance linked waitlist rows to quote_sent when sent_at is stamped. Never reverses. */
export async function markWaitlistQuoteSent(input: {
  quoteId: string;
  applicationId?: string | null;
  total: number;
  validUntil?: string | null;
  actorId?: string | null;
  sentAt: string;
}): Promise<MutationResult> {
  if (!supabase) return simulate();
  const orParts = [`quote_id.eq.${input.quoteId}`];
  if (input.applicationId) orParts.push(`application_id.eq.${input.applicationId}`);
  const { data: rows, error } = await supabase
    .from('waiting_list')
    .select('id, pipeline_stage')
    .or(orParts.join(','));
  if (error) return { error: error.message };

  const stamp = {
    quote_id: input.quoteId,
    quote_sent_date: input.sentAt.slice(0, 10),
    quoted_price: input.total,
    quote_expires_date: input.validUntil ?? null,
  };

  for (const row of rows ?? []) {
    const forward = buildForwardStagePatch(row.pipeline_stage, 'quote_sent', input.actorId, stamp);
    const patch = forward ?? stamp;
    const { error: upErr } = await supabase
      .from('waiting_list')
      .update(patch as TablesUpdate<'waiting_list'>)
      .eq('id', row.id);
    if (upErr) return { error: upErr.message };
  }
  return { error: null };
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
