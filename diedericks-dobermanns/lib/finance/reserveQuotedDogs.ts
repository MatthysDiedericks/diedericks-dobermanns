import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * On deposit, only a specific-puppy line reserves a dog. A future-litter or
 * unallocated line is a place in a queue — there is nothing to reserve.
 */
export async function reserveDogsFromQuote(
  supabase: SupabaseClient,
  quoteId: string,
): Promise<{ reserved: string[]; error?: string }> {
  const { data: items, error } = await supabase
    .from('quote_items')
    .select('dog_id, subject_kind')
    .eq('quote_id', quoteId);
  if (error) return { reserved: [], error: error.message };

  const dogIds = [
    ...new Set(
      (items ?? [])
        .filter((it) => it.subject_kind === 'dog' && it.dog_id)
        .map((it) => it.dog_id as string),
    ),
  ];
  if (!dogIds.length) return { reserved: [] };

  const reserved: string[] = [];
  for (const dogId of dogIds) {
    const { data: dog, error: loadErr } = await supabase
      .from('dogs')
      .select('id, status')
      .eq('id', dogId)
      .maybeSingle();
    if (loadErr) return { reserved, error: loadErr.message };
    if (!dog) continue;
    if (dog.status === 'sold' || dog.status === 'deceased') continue;
    if (dog.status === 'reserved') {
      reserved.push(dogId);
      continue;
    }
    const { error: updErr } = await supabase
      .from('dogs')
      .update({ status: 'reserved' })
      .eq('id', dogId)
      .eq('status', 'available');
    if (updErr) return { reserved, error: updErr.message };
    reserved.push(dogId);
  }
  return { reserved };
}
