/**
 * Shared insert shape for a puppy registered at birth. Add Puppy (one at a
 * time) and Register Pups (whole litter) must write the same columns and the
 * same birth-weight log, or the growth chart only works for one path.
 *
 * `status` is `available` for live pups. `puppy` is a category, not a status —
 * dogs_status_check rejects `status: "puppy"`. Non-live outcomes write
 * `status: "deceased"` rather than adding stillborn to that check.
 */

import {
  deceasedAtForOutcome,
  normalizePuppyOutcome,
  statusForOutcome,
  type PuppyOutcome,
} from '@/lib/litters/outcomes';

export type NewbornPuppyInput = {
  name: string;
  sex: 'male' | 'female';
  colour?: string | null;
  collar_colour?: string | null;
  birth_order?: number | null;
  birth_time?: string | null;
  birth_weight_grams?: number | null;
  date_of_birth: string;
  litter_id: string;
  outcome?: PuppyOutcome;
  outcome_date?: string | null;
  outcome_note?: string | null;
};

export function newbornPuppyInsert(input: NewbornPuppyInput) {
  const outcome = normalizePuppyOutcome(input.outcome);
  const deceasedAt = deceasedAtForOutcome({
    outcome,
    dateOfBirth: input.date_of_birth,
    outcomeDate: input.outcome_date,
  });
  return {
    name: input.name,
    breed: 'Dobermann',
    sex: input.sex,
    colour: input.colour || null,
    collar_colour: input.collar_colour || null,
    birth_order: input.birth_order ?? null,
    birth_time: input.birth_time || null,
    birth_weight_grams:
      input.birth_weight_grams && input.birth_weight_grams > 0
        ? input.birth_weight_grams
        : null,
    date_of_birth: input.date_of_birth,
    litter_id: input.litter_id,
    category: 'puppy' as const,
    status: statusForOutcome(outcome),
    outcome,
    outcome_date: deceasedAt,
    outcome_note: input.outcome_note?.trim() || null,
    deceased_at: deceasedAt,
    is_public: false,
    is_featured: false,
  };
}

export function birthWeightLogInsert(
  dogId: string,
  grams: number,
  recordedDate: string,
) {
  return {
    dog_id: dogId,
    weight_kg: grams / 1000,
    recorded_date: recordedDate,
    recorded_at: new Date().toISOString(),
    session: 'AM' as const,
    notes: 'Birth weight',
  };
}

export function shouldWriteBirthWeight(
  grams: number | null | undefined,
): grams is number {
  return typeof grams === 'number' && Number.isFinite(grams) && grams > 0;
}
