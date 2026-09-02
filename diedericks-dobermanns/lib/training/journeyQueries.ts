import { requireSupabase } from '@/lib/supabase';
import type { JourneyEntry } from '@/lib/training/journeyTypes';

const ENTRY_SELECT = '*, training_log_media(*)';

export async function fetchDogJourney(
  dogId: string,
): Promise<{ dogName: string; entries: JourneyEntry[] }> {
  const client = requireSupabase();
  const [{ data: dog, error: dogErr }, { data: entries, error: logErr }] = await Promise.all([
    client.from('dogs').select('id, name').eq('id', dogId).maybeSingle(),
    client
      .from('training_logs')
      .select(ENTRY_SELECT)
      .eq('dog_id', dogId)
      .order('session_date', { ascending: false }),
  ]);
  if (dogErr) throw new Error(dogErr.message);
  if (!dog) throw new Error('Dog not found.');
  if (logErr) throw new Error(logErr.message);

  const sorted = ((entries ?? []) as unknown as JourneyEntry[]).map((e) => ({
    ...e,
    training_log_media: [...(e.training_log_media ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order,
    ),
  }));
  return { dogName: dog.name, entries: sorted };
}
