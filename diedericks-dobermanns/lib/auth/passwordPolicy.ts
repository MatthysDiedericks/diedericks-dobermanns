/**
 * Minimum password length for client-facing auth screens.
 *
 * Mirrors the Supabase Auth project setting (Dashboard → Authentication →
 * Providers → Email → Minimum password length). Changing one without the other
 * reproduces the registration bug of 11 Aug 2026: the form accepted 8 characters
 * while Auth rejected with "Password should be at least 12 characters."
 */
export const MIN_PASSWORD_LENGTH = 12;

export function passwordLengthHint(length: number = MIN_PASSWORD_LENGTH): string {
  return `Minimum ${length} characters.`;
}

export function passwordTooShortMessage(
  length: number = MIN_PASSWORD_LENGTH,
): string {
  return `Password must be at least ${length} characters.`;
}
