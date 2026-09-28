/**
 * Categories that lapse. The keys in the prompt, plus the real keys stored
 * in document_categories (import_permit, kennel_licence, breed_society_registration).
 * `other` and `proof_of_payment` stay optional and quiet.
 */
const QUIET = new Set(['other', 'proof_of_payment']);

const EXACT = new Set([
  'registration',
  'insurance',
  'permit',
  'health_certificate',
  'membership',
  'licence',
  'license',
]);

export const NO_EXPIRY_REMINDER_NOTE =
  'No expiry date — this document will never appear in reminders.';

export function categoryAlwaysExpires(category: string | null | undefined): boolean {
  const key = (category ?? '').trim().toLowerCase();
  if (!key || QUIET.has(key)) return false;
  if (EXACT.has(key)) return true;
  if (key.includes('permit')) return true;
  if (key.includes('licence') || key.includes('license')) return true;
  if (key.includes('membership')) return true;
  if (key.includes('registration')) return true;
  return false;
}

export function categoryExpiryIsQuiet(category: string | null | undefined): boolean {
  return QUIET.has((category ?? '').trim().toLowerCase());
}
