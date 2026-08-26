import { requireSupabase } from '@/lib/supabase';
import { isProgrammeTierKey, type ProgrammeTierKey } from '@/lib/dogs/programmeTier';

/** Set programme_tier on the selected puppies only. Unselected rows are untouched. */
export async function setProgrammeTierForDogs(
  litterId: string,
  dogIds: string[],
  tier: ProgrammeTierKey | null,
): Promise<{ updated: number }> {
  if (tier != null && !isProgrammeTierKey(tier)) {
    throw new Error('Choose a valid programme tier.');
  }
  const ids = [...new Set(dogIds.filter(Boolean))];
  if (!ids.length) throw new Error('Tick at least one puppy.');

  const { data, error } = await requireSupabase()
    .from('dogs')
    .update({ programme_tier: tier } as never)
    .eq('litter_id', litterId)
    .in('id', ids)
    .select('id');
  if (error) throw new Error(error.message);
  return { updated: data?.length ?? 0 };
}
