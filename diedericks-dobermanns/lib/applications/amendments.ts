import { inspectPatch } from '@/lib/applications/amendmentGuard';
import { SENT_TO_MATT } from '@/lib/applications/fieldTiers';
import { requireSupabase, supabase } from '@/lib/supabase';
import type { MutationResult } from '@/lib/shared/mutationTypes';
import { simulate } from '@/lib/shared/mutationTypes';

export type AmendmentResult = MutationResult & {
  status?: string;
  versionNumber?: number;
  reviewedAt?: string | null;
  message?: string;
};

export async function saveMyApplicationAmendment(
  applicationId: string,
  patch: Record<string, unknown>,
): Promise<AmendmentResult> {
  if (!supabase) {
    await simulate();
    return { error: null, message: SENT_TO_MATT };
  }
  const inspected = inspectPatch(patch);
  if (inspected.error) return { error: inspected.error };

  const { data, error } = await requireSupabase().rpc('save_application_amendment', {
    p_application_id: applicationId,
    p_patch: patch,
  });
  if (error) return { error: error.message };
  const row = data as {
    status?: string;
    version_number?: number;
    reviewed_at?: string | null;
    tier_touched?: string;
  } | null;
  return {
    error: null,
    status: row?.status,
    versionNumber: row?.version_number,
    reviewedAt: row?.reviewed_at ?? null,
    message: row?.tier_touched === 'reapproval' ? SENT_TO_MATT : 'Saved.',
  };
}

export async function reapproveApplicationChanges(applicationId: string): Promise<MutationResult> {
  if (!supabase) return simulate();
  const { error } = await requireSupabase().rpc('reapprove_application_changes', {
    p_application_id: applicationId,
  });
  return { error: error?.message ?? null };
}
