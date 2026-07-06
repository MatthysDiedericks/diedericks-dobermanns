import { callNotify } from '@/lib/functions';
import { supabase } from '@/lib/supabase';
import type { DogPedigree, ReservationStatus } from '@/types/app.types';
import type { Json, TablesInsert, TablesUpdate } from '@/types/database.types';

import { simulate, type MutationResult, type SaveResult } from '@/lib/shared/mutationTypes';

export async function saveDog(
  values: TablesInsert<'dogs'>,
  id?: string,
): Promise<SaveResult> {
  if (!supabase) {
    await new Promise((r) => setTimeout(r, 500));
    return { error: null, id: id ?? `demo-${Date.now()}` };
  }
  if (id) {
    const { error } = await supabase
      .from('dogs')
      .update(values as TablesUpdate<'dogs'>)
      .eq('id', id);
    return { error: error?.message ?? null, id };
  }
  const { data, error } = await supabase
    .from('dogs')
    .insert(values)
    .select('id')
    .single();
  return {
    error: error?.message ?? null,
    id: data ? (data as { id: string }).id : null,
  };
}

export async function deleteDog(id: string): Promise<MutationResult> {
  if (!supabase) return simulate();
  const { error } = await supabase.from('dogs').delete().eq('id', id);
  return { error: error?.message ?? null };
}

/** Saves a dog's structured pedigree chart (JSONB column). */
export async function saveDogPedigree(
  id: string,
  pedigree: DogPedigree,
): Promise<MutationResult> {
  if (!supabase) return simulate();
  const { error } = await supabase
    .from('dogs')
    .update({ pedigree: pedigree as unknown as Json })
    .eq('id', id);
  return { error: error?.message ?? null };
}

export interface DogMediaInput {
  url: string;
  kind: 'image' | 'video' | 'document';
}

/**
 * Replaces a dog's full media set so reordering and removals persist. The list
 * order becomes `sort_order`; the first photo is marked primary (the cover used
 * as the thumbnail everywhere). Documents are ignored (dog_media is photo/video).
 */
export async function replaceDogMedia(
  dogId: string,
  media: DogMediaInput[],
): Promise<MutationResult> {
  if (!supabase) return simulate();
  const rows: TablesInsert<'dog_media'>[] = media
    .filter((m) => m.kind !== 'document')
    .map((m, i) => ({
      dog_id: dogId,
      type: m.kind === 'video' ? 'video' : 'photo',
      url: m.url,
      is_primary: false,
      sort_order: i,
    }));
  const firstPhoto = rows.findIndex((r) => r.type === 'photo');
  if (firstPhoto >= 0) rows[firstPhoto].is_primary = true;

  const { error: delErr } = await supabase.from('dog_media').delete().eq('dog_id', dogId);
  if (delErr) return { error: delErr.message };
  if (rows.length === 0) return { error: null };
  const { error } = await supabase.from('dog_media').insert(rows);
  return { error: error?.message ?? null };
}

/** Sets (or replaces) a dog's single primary photo via the dog_media table. */
export async function setPrimaryImage(
  dogId: string,
  url: string,
): Promise<MutationResult> {
  if (!supabase) return simulate();
  await supabase
    .from('dog_media')
    .update({ is_primary: false })
    .eq('dog_id', dogId)
    .eq('is_primary', true);
  const { error } = await supabase
    .from('dog_media')
    .insert({ dog_id: dogId, type: 'photo', url, is_primary: true });
  return { error: error?.message ?? null };
}

export async function saveLitter(
  values: TablesInsert<'litters'>,
  id?: string,
): Promise<MutationResult> {
  if (!supabase) return simulate();
  if (id) {
    const { error } = await supabase
      .from('litters')
      .update(values as TablesUpdate<'litters'>)
      .eq('id', id);
    return { error: error?.message ?? null };
  }
  const { error } = await supabase.from('litters').insert(values);
  return { error: error?.message ?? null };
}

export async function deleteLitter(id: string): Promise<MutationResult> {
  if (!supabase) return simulate();
  const { error } = await supabase.from('litters').delete().eq('id', id);
  return { error: error?.message ?? null };
}

/**
 * Updates a puppy reservation's status. When confirming, notifies the client.
 * Non-blocking notification — a failure never prevents the reservation update.
 */
export async function updateReservationStatus(
  id: string,
  status: ReservationStatus,
): Promise<MutationResult> {
  if (!supabase) return simulate();

  const { data: reservation, error: fetchErr } = await supabase
    .from('reservations')
    .select('client_id, dog:dogs(name)')
    .eq('id', id)
    .maybeSingle();
  if (fetchErr) return { error: fetchErr.message };

  const { error } = await supabase
    .from('reservations')
    .update({ status })
    .eq('id', id);
  if (error) return { error: error.message };

  if (status === 'confirmed' && reservation?.client_id) {
    const dogName = (reservation.dog as { name?: string } | null)?.name;
    void callNotify({
      userId: reservation.client_id,
      title: 'Puppy Reserved!',
      body: dogName
        ? `Your reservation for ${dogName} has been confirmed. Welcome to the Diedericks family.`
        : 'Your puppy reservation has been confirmed. Welcome to the Diedericks family.',
      data: { screen: 'reservation' },
    });
  }

  return { error: null };
}
