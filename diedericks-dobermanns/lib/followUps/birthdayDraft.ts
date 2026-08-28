/**
 * Birthday check-in copy for Matt. Keep in sync with
 * diedericksdobermann-web/src/lib/followUps/birthdayDraft.ts
 * and public.generate_due_check_ins(). Never a client-facing auto-send. No sales line.
 */

import { realDogName } from '@/lib/dogs/placeholderName';

const TASK_FOOTER =
  'This is a task for you. You send any message to the owner — nothing is sent automatically.';

export type BirthdayCheckInInput = {
  ageTurning: number;
  dueIsToday: boolean;
  dueLabel: string;
  callName?: string | null;
  kennelName?: string | null;
  sex?: string | null;
  collarColour?: string | null;
  litterLabel?: string | null;
};

function titleColour(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function unnamedDogIdentity(input: {
  sex?: string | null;
  collarColour?: string | null;
  litterLabel?: string | null;
}): string {
  const bits: string[] = [];
  if (input.sex === 'female') bits.push('Female');
  else if (input.sex === 'male') bits.push('Male');
  const collar = input.collarColour?.trim();
  if (collar && collar.toLowerCase() !== 'none') {
    bits.push(`${titleColour(collar)} collar`);
  }
  if (input.litterLabel?.trim()) bits.push(input.litterLabel.trim());
  return bits.join(', ');
}

export function isUnnamedBirthdayCheckIn(
  kind: string | null | undefined,
  callName: string | null | undefined,
  kennelName: string | null | undefined,
): boolean {
  return kind === 'birthday' && realDogName(callName, kennelName) == null;
}

/** Matt's birthday task. Named dogs get "Ade turns 3 today." Placeholders are never used. */
export function buildBirthdayCheckIn(input: BirthdayCheckInInput): string {
  const when = input.dueIsToday ? 'today' : `on ${input.dueLabel}`;
  const real = realDogName(input.callName, input.kennelName);
  if (real) {
    return `${real} turns ${input.ageTurning} ${when}.\n\n${TASK_FOOTER}`;
  }
  const identity = unnamedDogIdentity(input) || 'A placed dog';
  return (
    `${identity} turns ${input.ageTurning} ${when}. No name recorded.\n\n` +
    `Do not wish them happy birthday using the kennel placeholder. ` +
    `Ask what they call this dog, then record it. ${TASK_FOOTER}`
  );
}

/** @deprecated Use buildBirthdayCheckIn — kept for the old WhatsApp-draft call shape. */
export function buildBirthdayDraft(input: {
  contactFirstName: string;
  dogCallName: string;
  ageTurning: number;
  dueLabel: string;
  litterLabel?: string | null;
  pronoun?: string | null;
}): string {
  return buildBirthdayCheckIn({
    ageTurning: input.ageTurning,
    dueIsToday: input.dueLabel.toLowerCase() === 'today',
    dueLabel: input.dueLabel,
    callName: input.dogCallName,
    litterLabel: input.litterLabel,
  });
}
