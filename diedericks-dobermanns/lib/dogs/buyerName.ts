import { requireSupabase } from '@/lib/supabase';
import {
  buyerNameFields,
  isPlaceholderDogName,
} from '@/lib/dogs/placeholderName';

/** Save the name the buyer uses at handover. Rejects Puppy N placeholders. */
export async function recordBuyerCallName(
  dogId: string,
  buyerName: string,
  currentKennelName?: string | null,
): Promise<{ error: string | null }> {
  if (isPlaceholderDogName(buyerName)) {
    return { error: 'Record the name the buyer uses — not Puppy 7 or a blank.' };
  }
  let kennelName = currentKennelName ?? null;
  if (kennelName == null) {
    const { data } = await requireSupabase()
      .from('dogs')
      .select('name')
      .eq('id', dogId)
      .maybeSingle();
    kennelName = data?.name ?? null;
  }
  const { error } = await requireSupabase()
    .from('dogs')
    .update(buyerNameFields(kennelName, buyerName) as never)
    .eq('id', dogId);
  return { error: error?.message ?? null };
}
