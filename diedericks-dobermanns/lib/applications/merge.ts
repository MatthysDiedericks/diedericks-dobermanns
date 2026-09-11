import { requireSupabase } from '@/lib/supabase';
import {
  defaultMarketingOptIn,
  marketingOptInDisagrees,
  mergeEventMessage,
  type MergeApp,
} from '@/lib/applications/mergeDuplicates';

function referenceOf(id: string, code: string | null | undefined): string {
  return code ?? `DD-${id.slice(0, 8).toUpperCase()}`;
}

/**
 * Archives losers and points them at the survivor. Never deletes a row.
 */
export async function mergeDuplicateApplications(input: {
  survivorId: string;
  loserIds: string[];
  marketingOptIn?: boolean;
  actorId: string;
  actorName: string;
}): Promise<{ error?: string; survivorId?: string }> {
  const survivorId = input.survivorId.trim();
  const loserIds = [...new Set(input.loserIds.map((id) => id.trim()).filter(Boolean))];
  if (!survivorId) return { error: 'Pick which application to keep.' };
  if (loserIds.length === 0) return { error: 'There is nothing to merge.' };
  if (loserIds.includes(survivorId)) {
    return { error: 'The record you keep cannot also be archived.' };
  }

  const supabase = requireSupabase();
  const ids = [survivorId, ...loserIds];
  const { data, error } = await supabase
    .from('applications')
    .select('id, created_at, archived_at, merged_into_application_id, marketing_opt_in, reference_code')
    .in('id', ids);
  if (error) return { error: error.message };

  const rows = (data ?? []) as Array<
    MergeApp & {
      archived_at: string | null;
      merged_into_application_id: string | null;
      reference_code: string | null;
    }
  >;
  if (rows.length !== ids.length) {
    return { error: 'One of these applications is no longer available. Nothing was changed.' };
  }

  const byId = new Map(rows.map((row) => [row.id, row]));
  const survivor = byId.get(survivorId);
  if (!survivor) return { error: 'The application to keep was not found.' };
  if (survivor.archived_at || survivor.merged_into_application_id) {
    return { error: 'The application to keep is already archived or merged.' };
  }

  const now = new Date().toISOString();
  const { error: archiveError } = await supabase
    .from('applications')
    .update({
      archived_at: now,
      archived_by: input.actorId,
      archived_reason: 'merged',
      merged_into_application_id: survivorId,
    } as never)
    .in('id', loserIds)
    .is('archived_at', null);
  if (archiveError) return { error: archiveError.message };

  const { data: stillThere, error: countError } = await supabase
    .from('applications')
    .select('id')
    .in('id', loserIds);
  if (countError) return { error: countError.message };
  if ((stillThere ?? []).length !== loserIds.length) {
    return { error: 'Merge aborted — a row disappeared. Nothing further was written.' };
  }

  const chosenOptIn =
    input.marketingOptIn !== undefined
      ? input.marketingOptIn
      : marketingOptInDisagrees(rows)
        ? defaultMarketingOptIn(rows)
        : Boolean(survivor.marketing_opt_in);

  if (Boolean(survivor.marketing_opt_in) !== chosenOptIn) {
    const { error: optError } = await supabase
      .from('applications')
      .update({ marketing_opt_in: chosenOptIn } as never)
      .eq('id', survivorId);
    if (optError) return { error: optError.message };
  }

  const loserRefs = loserIds.map((id) => referenceOf(id, byId.get(id)?.reference_code));
  const { error: eventError } = await supabase.from('application_events' as never).insert({
    application_id: survivorId,
    event_type: 'note',
    message: mergeEventMessage(loserRefs, input.actorName).slice(0, 500),
    created_by: input.actorId,
  } as never);
  if (eventError) {
    console.error('[mergeDuplicateApplications] event failed:', eventError.message);
  }

  return { survivorId };
}
