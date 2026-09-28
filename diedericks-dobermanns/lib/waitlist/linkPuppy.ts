import { supabase } from '@/lib/supabase';
import { linkPuppyPatch } from '@/lib/waitlist/placementClose';

export type LinkDogOption = {
  id: string;
  name: string;
  status: string | null;
};

function safeQuery(value: string): string {
  return value.replace(/[%_]/g, '').trim();
}

/** Puppies on the litter stored on this line. */
export async function litterDogsForLink(
  litterId: string,
): Promise<{ dogs: LinkDogOption[]; error: string | null }> {
  if (!supabase) return { dogs: [], error: null };
  const { data, error } = await supabase
    .from('dogs')
    .select('id, name, status')
    .eq('litter_id', litterId)
    .order('name')
    .limit(40);
  return {
    dogs: (data ?? []) as LinkDogOption[],
    error: error?.message ?? null,
  };
}

/** Sold dogs only. The buyer is never matched by name. */
export async function searchSoldDogsForLink(
  query: string,
): Promise<{ dogs: LinkDogOption[]; error: string | null }> {
  if (!supabase) return { dogs: [], error: null };
  const q = safeQuery(query);
  if (q.length < 2) return { dogs: [], error: null };
  const { data, error } = await supabase
    .from('dogs')
    .select('id, name, status')
    .eq('status', 'sold')
    .ilike('name', `%${q}%`)
    .order('name')
    .limit(20);
  return {
    dogs: (data ?? []) as LinkDogOption[],
    error: error?.message ?? null,
  };
}

/** Stores the puppy. Leaves pipeline_stage and status untouched. */
export async function linkPuppyToEntry(
  entryId: string,
  dogId: string,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Not connected.' };
  const { data: dog, error: dogErr } = await supabase
    .from('dogs')
    .select('id, litter_id')
    .eq('id', dogId)
    .maybeSingle();
  if (dogErr) return { error: dogErr.message };
  if (!dog) return { error: 'Dog not found.' };
  const patch = linkPuppyPatch({ id: dog.id, litter_id: dog.litter_id });
  const { error } = await supabase.from('waiting_list').update(patch as never).eq('id', entryId);
  return { error: error?.message ?? null };
}
