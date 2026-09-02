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
