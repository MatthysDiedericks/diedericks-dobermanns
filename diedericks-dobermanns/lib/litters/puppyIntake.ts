/**
 * A newborn is saved one at a time. Puppy 4 being incomplete must not block
 * puppy 3. Colour is not required — a wet newborn's colour is a guess.
 */

export type IntakeField = 'sex' | 'collar' | 'tail' | 'weight' | 'time';

export type IntakeErrors = Partial<Record<IntakeField | 'duplicate', string>>;

export type PuppyIntakeInput = {
  sex?: string | null;
  collarColour?: string | null;
  tailType?: string | null;
  birthWeightGrams?: number | null;
  birthTime?: string | null;
  usedCollars?: string[];
  /** He may genuinely have run out of colours. Warn, then allow this. */
  allowDuplicateCollar?: boolean;
};

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

export function validatePuppyIntake(input: PuppyIntakeInput): IntakeErrors {
  const errors: IntakeErrors = {};
  const sex = (input.sex ?? '').trim();
  if (sex !== 'male' && sex !== 'female') {
    errors.sex = 'Sex is required.';
  }

  const collar = (input.collarColour ?? '').trim();
  if (!collar || collar === 'none') {
    errors.collar = 'Collar colour is required — it is how you tell them apart.';
  } else if (
    !input.allowDuplicateCollar &&
    (input.usedCollars ?? []).includes(collar)
  ) {
    errors.duplicate = `Another pup in this litter already has a ${collar.replace(/_/g, ' ')} collar. Save anyway only if you have run out.`;
  }

  const tail = (input.tailType ?? '').trim();
  if (tail !== 'docked' && tail !== 'natural') {
    errors.tail = 'Tail is required — docked or natural.';
  }

  const grams = input.birthWeightGrams;
  if (grams == null || !Number.isFinite(grams) || grams <= 0) {
    errors.weight = 'Birth weight is required, in grams.';
  }

  const time = (input.birthTime ?? '').trim().slice(0, 5);
  if (!TIME.test(time)) {
    errors.time = 'Birth time is required.';
  }

  return errors;
}

export function intakeIsComplete(errors: IntakeErrors): boolean {
  return Object.keys(errors).length === 0;
}

/**
 * Each pup is judged on its own. An incomplete later pup is left behind;
 * earlier complete pups are returned so they can be saved.
 */
export function savablePuppyIndexes(
  pups: PuppyIntakeInput[],
): number[] {
  return pups.flatMap((pup, index) =>
    intakeIsComplete(validatePuppyIntake(pup)) ? [index] : [],
  );
}

export function formatPuppySaved(input: {
  order: number;
  total?: number | null;
  collarLabel: string;
  sex: string;
  grams: number;
  time: string;
}): string {
  const who =
    input.total != null && input.total > 0
      ? `Puppy ${input.order} of ${input.total}`
      : `Puppy ${input.order}`;
  const sex = input.sex === 'male' ? 'male' : input.sex === 'female' ? 'female' : input.sex;
  const time = input.time.slice(0, 5);
  return `${who} saved — ${input.collarLabel.toLowerCase()} collar, ${sex}, ${Math.round(input.grams)} g, ${time}`;
}
