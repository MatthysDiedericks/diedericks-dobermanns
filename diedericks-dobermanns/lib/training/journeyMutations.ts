import { requireSupabase } from '@/lib/supabase';

export type JourneyWrite = {
  session_date: string;
  training_type: string;
  phase: string | null;
  progress_level: string | null;
  milestone: string | null;
  duration_minutes: number | null;
  notes: string | null;
  is_public: boolean;
};

export async function saveJourneyEntry(
  dogId: string,
  id: string | null,
  patch: JourneyWrite,
): Promise<string> {
  const client = requireSupabase();
  if (id) {
    const { error } = await client
      .from('training_logs')
      .update({ ...patch, is_draft: false })
      .eq('id', id)
      .eq('dog_id', dogId);
    if (error) throw new Error(error.message);
    return id;
  }
  const { data, error } = await client
    .from('training_logs')
    .insert({
      dog_id: dogId,
      session_date: patch.session_date,
      training_type: patch.training_type,
      duration_minutes: patch.duration_minutes,
      milestone: patch.milestone,
      progress_level: patch.progress_level,
      notes: patch.notes,
      phase: patch.phase,
      is_public: patch.is_public,
      is_draft: false,
    })
    .select('id')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Could not create the entry.');
  return data.id;
}

export async function deleteJourneyEntry(id: string, dogId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client.from('training_logs').delete().eq('id', id).eq('dog_id', dogId);
  if (error) throw new Error(error.message);
}

export async function quickCaptureTimelineMedia(input: {
  dogId: string;
  sessionDate: string;
  url: string;
  storagePath: string;
  caption?: string | null;
}): Promise<{ dogName: string } | { error: string }> {
  const client = requireSupabase();
  const { data: dog, error: dogError } = await client
    .from('dogs')
    .select('id, name')
    .eq('id', input.dogId)
    .single();
  if (dogError || !dog) return { error: 'Dog not found.' };

  const { data: existingDraft } = await client
    .from('training_logs')
    .select('id')
    .eq('dog_id', input.dogId)
    .eq('session_date', input.sessionDate)
    .eq('is_draft', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let logId = existingDraft?.id ?? null;
  if (!logId) {
    const { data: created, error: createError } = await client
      .from('training_logs')
      .insert({
        dog_id: input.dogId,
        session_date: input.sessionDate,
        training_type: 'session',
        is_draft: true,
        is_public: false,
      })
      .select('id')
      .single();
    if (createError || !created) {
      return { error: createError?.message ?? 'Could not create the journey entry.' };
    }
    logId = created.id;
  }

  const { count } = await client
    .from('training_log_media')
    .select('id', { count: 'exact', head: true })
    .eq('training_log_id', logId);

  const { error: mediaError } = await client.from('training_log_media').insert({
    training_log_id: logId,
    media_type: 'photo',
    storage_path: input.storagePath,
    public_url: input.url,
    caption: input.caption ?? null,
    sort_order: count ?? 0,
  });
  if (mediaError) return { error: mediaError.message };
  return { dogName: dog.name };
}
