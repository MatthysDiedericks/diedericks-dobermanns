/**
 * Birthday WhatsApp draft — tone from retired send-birthday-greetings email.
 * Keep in sync with diedericksdobermann-web/src/lib/followUps/birthdayDraft.ts
 * and public.generate_due_check_ins(). No sales line.
 */

export type BirthdayDraftInput = {
  contactFirstName: string;
  dogCallName: string;
  ageTurning: number;
  dueLabel: string;
  litterLabel?: string | null;
  pronoun?: string | null;
};

export function buildBirthdayDraft(input: BirthdayDraftInput): string {
  const name = input.contactFirstName.trim() || 'there';
  const dog = input.dogCallName.trim() || 'your dog';
  const litter = input.litterLabel?.trim()
    ? ` (${input.litterLabel.trim()})`
    : '';
  const pronoun = input.pronoun?.trim() || 'they';
  return (
    `Hi ${name}, ${dog} turns ${input.ageTurning} on ${input.dueLabel}${litter}. ` +
    `We remember every dog we breed — hope the year ahead is a good one for both of you. ` +
    `How is ${pronoun} doing?`
  );
}
