import { supabase } from '@/lib/supabase';

/**
 * Links a dog to a client's login: sets `dogs.owner_id` and confirms a
 * `reservations` row. Mirrored from the web `allocation-actions.ts` — portal
 * RLS requires both paths. Do not invent a second allocation path.
 */
export async function allocateDogToClient(
  dogId: string,
  clientUserId: string,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Supabase not configured' };

  const { data: client, error: clientErr } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', clientUserId)
    .maybeSingle();
  if (clientErr) return { error: clientErr.message };
  if (!client || client.role !== 'client') {
    return { error: 'Selected account is not a client.' };
  }

  const { error: dogErr } = await supabase
    .from('dogs')
    .update({ owner_id: clientUserId, status: 'sold', handover_status: 'awaiting_go_home' } as never)
    .eq('id', dogId);
  if (dogErr) return { error: dogErr.message };

  const { data: existing, error: findErr } = await supabase
    .from('reservations')
    .select('id, status')
    .eq('dog_id', dogId)
    .eq('client_id', clientUserId)
    .maybeSingle();
  if (findErr) return { error: findErr.message };

  if (existing) {
    if (existing.status !== 'confirmed') {
      const { error } = await supabase
        .from('reservations')
        .update({ status: 'confirmed' })
        .eq('id', existing.id);
      if (error) return { error: error.message };
    }
  } else {
    const { error } = await supabase.from('reservations').insert({
      dog_id: dogId,
      client_id: clientUserId,
      status: 'confirmed',
    });
    if (error) return { error: error.message };
  }

  return { error: null };
}
