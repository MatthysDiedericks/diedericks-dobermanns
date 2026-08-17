/**
 * Client-side mirror of the live Supabase Auth password rules.
 *
 * Confirmed 17 Aug 2026 from AUTH_REGISTRATION_BLOCKED on /portal/register
 * (3 events today) and a GoTrue signup probe (weak_password / characters).
 * Dashboard Auth API was not readable (no SUPABASE_ACCESS_TOKEN).
 *
 * GoTrue: min length 12 (existing project setting) AND at least one character
 * from each group: lowercase, uppercase, digits, symbols.
 * Exact GoTrue message:
 * "Password should contain at least one character of each:
 *  abcdefghijklmnopqrstuvwxyz, ABCDEFGHIJKLMNOPQRSTUVWXYZ, 0123456789,
 *  !@#$%^&*()_+-=[]{};':\"|<>?,./`~."
 */
export const MIN_PASSWORD_LENGTH = 12;

/** Fourth GoTrue required-character group (default Auth "symbols" set). */
export const PASSWORD_SYMBOLS = "!@#$%^&*()_+-=[]{};':\"|<>?,./`~";

export type PasswordCheckId =
  | 'length'
  | 'lower'
  | 'upper'
  | 'digit'
  | 'symbol';

export type PasswordCheck = {
  id: PasswordCheckId;
  label: string;
  met: boolean;
};

function hasSymbol(password: string): boolean {
  for (const ch of password) {
    if (PASSWORD_SYMBOLS.includes(ch)) return true;
  }
  return false;
}

export function evaluatePassword(password: string): PasswordCheck[] {
  return [
    {
      id: 'length',
      label: `At least ${MIN_PASSWORD_LENGTH} characters`,
      met: password.length >= MIN_PASSWORD_LENGTH,
    },
    {
      id: 'lower',
      label: 'A lowercase letter',
      met: /[a-z]/.test(password),
    },
    {
      id: 'upper',
      label: 'An uppercase letter',
      met: /[A-Z]/.test(password),
    },
    {
      id: 'digit',
      label: 'A number',
      met: /[0-9]/.test(password),
    },
    {
      id: 'symbol',
      label: 'A symbol',
      met: hasSymbol(password),
    },
  ];
}

export function passwordMeetsPolicy(password: string): boolean {
  return evaluatePassword(password).every((check) => check.met);
}

export function passwordPolicyFailMessage(): string {
  return `Password must be at least ${MIN_PASSWORD_LENGTH} characters and include a lowercase letter, an uppercase letter, a number, and a symbol.`;
}

export function passwordLengthHint(length: number = MIN_PASSWORD_LENGTH): string {
  return `Minimum ${length} characters, plus upper, lower, a number and a symbol.`;
}

export function passwordTooShortMessage(
  length: number = MIN_PASSWORD_LENGTH,
): string {
  void length;
  return passwordPolicyFailMessage();
}
