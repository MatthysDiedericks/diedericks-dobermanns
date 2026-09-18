import { callNotify } from '@/lib/functions';
import {
  deceasedAtStamp,
  soldMissingBuyer,
  type DogStatus,
} from '@/lib/dogs/status';
import { blank, firstLitterError, validateLitter } from '@/lib/litters/validate';
import {
  fetchLitterDeleteImpact,
  LITTER_STATUS_ARCHIVED,
  litterDangerMode,
  namesMatch,
  type LitterDeleteImpact,
} from '@/lib/litters/deleteImpact';
import {
  birthWeightLogInsert,
  newbornPuppyInsert,
  shouldWriteBirthWeight,
} from '@/lib/litters/newbornPuppy';
import { puppyDidNotSurvive, type PuppyOutcome } from '@/lib/litters/outcomes';
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

export async function updateDogStatus(
  dogId: string,
  status: DogStatus,
): Promise<{
  error: string | null;
  stampedDeceasedAt: boolean;
  missingBuyer: boolean;
}> {
  if (!supabase) {
    await new Promise((r) => setTimeout(r, 300));
    return { error: null, stampedDeceasedAt: status === 'deceased', missingBuyer: status === 'sold' };
  }
  const { data: dog, error: fetchErr } = await supabase
    .from('dogs')
    .select('deceased_at, new_owner_name, buyer_contact_id')
    .eq('id', dogId)
    .maybeSingle();
  if (fetchErr) {
    return { error: fetchErr.message, stampedDeceasedAt: false, missingBuyer: false };
  }
  if (!dog) {
    return { error: 'Dog not found.', stampedDeceasedAt: false, missingBuyer: false };
  }

  const patch: TablesUpdate<'dogs'> = { status };
  const deceasedAt = deceasedAtStamp(status, dog.deceased_at);
  if (deceasedAt) patch.deceased_at = deceasedAt;

  const { error } = await supabase.from('dogs').update(patch).eq('id', dogId);
  return {
    error: error?.message ?? null,
    stampedDeceasedAt: Boolean(deceasedAt),
    missingBuyer: status === 'sold' && soldMissingBuyer(dog),
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
 * order becomes `sort_order`. `is_primary` is never set here — that flag is
 * only written when someone clicks "Set as profile photo". Documents are
 * ignored (dog_media is photo/video).
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

  const { error: delErr } = await supabase.from('dog_media').delete().eq('dog_id', dogId);
  if (delErr) return { error: delErr.message };
  if (rows.length === 0) return { error: null };
  const { error } = await supabase.from('dog_media').insert(rows);
  return { error: error?.message ?? null };
}

export interface AddDogMediaInput {
  dogId: string;
  type: 'photo' | 'video';
  url: string;
  /** Staff uploads default public; client uploads must pass `false` explicitly. */
  isPublic?: boolean;
  uploadedBy?: string | null;
  /** Only meaningful for client uploads — whether the owner agreed to a future publish. */
  clientConsent?: boolean;
  caption?: string | null;
}

/**
 * Adds one dog_media row. Shared by the admin "attach to a dog" upload and
 * the client "add photos of my dog" upload — the difference between them is
 * entirely in what the caller passes for isPublic/clientConsent, never in
 * this function. RLS still forces is_public=false for a client-owned insert
 * regardless of what's passed here, so this is defence in depth, not the
 * only guard.
 */
export async function addDogMedia(input: AddDogMediaInput): Promise<MutationResult> {
  if (!supabase) return simulate();
  const row: TablesInsert<'dog_media'> = {
    dog_id: input.dogId,
    type: input.type,
    url: input.url,
    is_public: input.isPublic ?? true,
    uploaded_by: input.uploadedBy ?? null,
    client_consent: input.clientConsent ?? false,
    caption: input.caption?.trim() || null,
  };
  const { error } = await supabase.from('dog_media').insert(row);
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
  options?: { includeRetiredAndDeceasedDams?: boolean },
): Promise<SaveResult> {
  if (!supabase) {
    await new Promise((r) => setTimeout(r, 500));
    return { error: null, id: id ?? `demo-litter-${Date.now()}` };
  }

  const motherId = (values.mother_id as string | null) ?? null;
  const fatherId = (values.father_id as string | null) ?? null;
  const ids = [motherId, fatherId].filter((row): row is string => Boolean(row));
  let dam = null;
  let sire = null;
  if (ids.length > 0) {
    const { data } = await supabase
      .from('dogs')
      .select('id, name, sex, status, deceased_at')
      .in('id', ids);
    const rows = (data ?? []) as {
      id: string;
      name: string;
      sex: string | null;
      status: string | null;
      deceased_at: string | null;
    }[];
    dam = rows.find((d) => d.id === motherId) ?? null;
    sire = rows.find((d) => d.id === fatherId) ?? null;
  }

  let existingMotherId: string | null | undefined;
  let existingFatherId: string | null | undefined;
  if (id) {
    const { data: existing } = await supabase
      .from('litters')
      .select('mother_id, father_id')
      .eq('id', id)
      .maybeSingle();
    existingMotherId = existing?.mother_id ?? null;
    existingFatherId = existing?.father_id ?? null;
  }

  const problems = validateLitter({
    name: values.name as string | null,
    status: String(values.status ?? ''),
    mother_id: motherId,
    father_id: fatherId,
    expected_date: (values.expected_date as string | null) ?? null,
    actual_date: (values.actual_date as string | null) ?? null,
    dam,
    sire,
    includeRetiredAndDeceasedDams: options?.includeRetiredAndDeceasedDams,
    existingMotherId,
    existingFatherId,
  });
  const refused = firstLitterError(problems);
  if (refused) return { error: refused, id: id ?? null };

  if (!id && motherId && fatherId) {
    const actualDate = blank(values.actual_date as string | null);
    const expectedDate = blank(values.expected_date as string | null);
    const date = actualDate ?? expectedDate;
    if (date) {
      let query = supabase
        .from('litters')
        .select('id')
        .eq('mother_id', motherId)
        .eq('father_id', fatherId);
      query = actualDate
        ? query.eq('actual_date', actualDate)
        : query.eq('expected_date', date);
      const { data: duplicate } = await query.limit(1).maybeSingle();
      if (duplicate) {
        return { error: null, id: (duplicate as { id: string }).id };
      }
    }
  }

  if (id) {
    const { error } = await supabase
      .from('litters')
      .update(values as TablesUpdate<'litters'>)
      .eq('id', id);
    return { error: error?.message ?? null, id };
  }
  const { data, error } = await supabase
    .from('litters')
    .insert(values)
    .select('id')
    .single();
  return {
    error: error?.message ?? null,
    id: data ? (data as { id: string }).id : null,
  };
}

/** Links a heat cycle to a newly created litter after whelping. */
export async function linkBreedingToLitter(
  heatCycleId: string,
  litterId: string,
  actualWhelpDate: string | null,
): Promise<MutationResult> {
  if (!supabase) return simulate();
  const { error } = await supabase
    .from('heat_cycles')
    .update({
      resulting_litter_id: litterId,
      actual_whelp_date: actualWhelpDate,
      status: 'completed',
    })
    .eq('id', heatCycleId);
  return { error: error?.message ?? null };
}

/** Marks a breeding as producing no litter — keeps the record as history. */
export async function markBreedingNoOutcome(
  heatCycleId: string,
  reason = 'No litter produced',
): Promise<MutationResult> {
  if (!supabase) return simulate();
  const { error } = await supabase
    .from('heat_cycles')
    .update({ status: 'no_outcome', cancelled_reason: reason })
    .eq('id', heatCycleId);
  return { error: error?.message ?? null };
}

export async function getLitterDeleteImpact(
  id: string,
): Promise<{ impact: LitterDeleteImpact | null; error: string | null }> {
  if (!supabase) return { impact: null, error: 'Not connected.' };
  try {
    const impact = await fetchLitterDeleteImpact(supabase as never, id);
    return { impact, error: null };
  } catch (e) {
    return { impact: null, error: e instanceof Error ? e.message : 'Could not load counts.' };
  }
}

export async function deleteLitter(id: string, typedName: string): Promise<MutationResult> {
  if (!supabase) return simulate();
  try {
    const impact = await fetchLitterDeleteImpact(supabase as never, id);
    if (litterDangerMode(impact) === 'archive') {
      return { error: 'This litter has puppies. Archive it instead.' };
    }
    if (!namesMatch(impact.litterName, typedName)) {
      return { error: 'Type the litter name to confirm.' };
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not check this litter.' };
  }
  const { error } = await supabase.from('litters').delete().eq('id', id);
  return { error: error?.message ?? null };
}

export async function archiveLitter(id: string): Promise<MutationResult> {
  if (!supabase) return simulate();
  const { error } = await supabase
    .from('litters')
    .update({ status: LITTER_STATUS_ARCHIVED, is_public: false })
    .eq('id', id);
  return { error: error?.message ?? null };
}

export async function startWhelping(litterId: string): Promise<MutationResult> {
  if (!supabase) return simulate();
  const { data: litter, error: fetchErr } = await supabase
    .from('litters')
    .select('id, actual_date')
    .eq('id', litterId)
    .maybeSingle();
  if (fetchErr) return { error: fetchErr.message };
  if (!litter) return { error: 'Litter not found.' };
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from('litters')
    .update({
      status: 'born',
      actual_date: litter.actual_date || today,
    })
    .eq('id', litterId);
  return { error: error?.message ?? null };
}

export async function finishWhelping(litterId: string): Promise<MutationResult> {
  if (!supabase) return simulate();
  const { data: pups, error: pupErr } = await supabase
    .from('dogs')
    .select('sex, status, outcome, deceased_at')
    .eq('litter_id', litterId);
  if (pupErr) return { error: pupErr.message };
  const rows = pups ?? [];
  let males = 0;
  let females = 0;
  let deceased = 0;
  for (const p of rows) {
    if (puppyDidNotSurvive(p)) {
      deceased += 1;
      continue;
    }
    if (p.sex === 'male') males += 1;
    else if (p.sex === 'female') females += 1;
  }
  const { error } = await supabase
    .from('litters')
    .update({
      puppy_count: rows.length,
      male_count: males,
      female_count: females,
      deceased_count: deceased,
    })
    .eq('id', litterId);
  return { error: error?.message ?? null };
}

export async function addPuppyToLitter(input: {
  litterId: string;
  birth_order: number;
  sex: 'male' | 'female';
  collar_colour?: string | null;
  colour?: string | null;
  birth_weight_grams?: number | null;
  birth_time?: string | null;
  name?: string;
  outcome?: PuppyOutcome;
  outcome_date?: string | null;
  outcome_note?: string | null;
}): Promise<SaveResult> {
  if (!supabase) {
    await new Promise((r) => setTimeout(r, 300));
    return { error: null, id: `demo-${Date.now()}` };
  }
  const { data: litter, error: litterErr } = await supabase
    .from('litters')
    .select('actual_date, litter_letter, male_count, female_count')
    .eq('id', input.litterId)
    .maybeSingle();
  if (litterErr) return { error: litterErr.message, id: null };
  if (!litter) return { error: 'Litter not found.', id: null };

  const letter = litter.litter_letter?.trim().toUpperCase() ?? '';
  const name =
    input.name?.trim() ||
    (letter ? `${letter}${input.birth_order}` : `Puppy ${input.birth_order}`);
  const birthDate = litter.actual_date ?? new Date().toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('dogs')
    .insert(
      newbornPuppyInsert({
        name,
        sex: input.sex,
        colour: input.colour,
        collar_colour: input.collar_colour,
        birth_order: input.birth_order,
        birth_time: input.birth_time,
        birth_weight_grams: input.birth_weight_grams,
        date_of_birth: birthDate,
        litter_id: input.litterId,
        outcome: input.outcome,
        outcome_date: input.outcome_date,
        outcome_note: input.outcome_note,
      }),
    )
    .select('id')
    .single();
  if (error) return { error: error.message, id: null };

  if (shouldWriteBirthWeight(input.birth_weight_grams)) {
    const { error: weightError } = await supabase
      .from('weight_logs')
      .insert(birthWeightLogInsert(data.id, input.birth_weight_grams, birthDate));
    if (weightError) return { error: weightError.message, id: data.id };
  }

  const live = (input.outcome ?? 'live') === 'live';
  if (live) {
    const males = (litter.male_count ?? 0) + (input.sex === 'male' ? 1 : 0);
    const females = (litter.female_count ?? 0) + (input.sex === 'female' ? 1 : 0);
    await supabase
      .from('litters')
      .update({
        male_count: males,
        female_count: females,
        puppy_count: males + females,
      })
      .eq('id', input.litterId);
  }

  return { error: null, id: data.id };
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
