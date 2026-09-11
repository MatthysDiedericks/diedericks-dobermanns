import { z } from 'zod';

/** Required on every contact create/save. Applications store the same stripped form. */
export const PHONE_REQUIRED_MESSAGE = 'A phone number is required.';
export const PHONE_INVALID_MESSAGE = 'Enter a valid phone number.';
export const PHONE_PLACEHOLDER_MESSAGE =
  'That is not a real number. If you do not have one, leave the record and come back when you do.';
export const CONTACT_MISSING_PHONE_BANNER =
  'This contact has no phone number. Add one to save your changes.';

const SEQUENTIAL = '1234567890';

/** Strip spaces, dashes and brackets — the only punctuation applications used to keep. */
export function stripPhoneInput(raw: string): string {
  return raw.replace(/[\s\-()]/g, '');
}

function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, '');
}

function isPlaceholderDigits(digits: string): boolean {
  if (!digits) return true;
  if (/^(\d)\1+$/.test(digits)) return true;
  if (digits === SEQUENTIAL || digits.startsWith(SEQUENTIAL)) return true;
  return false;
}

export type ParsePhoneResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

/**
 * Validate and normalise a phone number.
 * Accepts SA (`0821234567`, `+27821234567`) and international (`+268…`, `+44…`).
 * Stores stripped digits, keeping a leading `+` when the caller supplied one.
 */
export function parsePhone(raw: string | null | undefined): ParsePhoneResult {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return { ok: false, error: PHONE_REQUIRED_MESSAGE };

  const stripped = stripPhoneInput(trimmed);
  if (!/^\+?\d+$/.test(stripped)) {
    return { ok: false, error: PHONE_INVALID_MESSAGE };
  }

  const digits = digitsOnly(stripped);
  if (digits.length < 9) return { ok: false, error: PHONE_INVALID_MESSAGE };
  if (isPlaceholderDigits(digits)) {
    return { ok: false, error: PHONE_PLACEHOLDER_MESSAGE };
  }

  const value = stripped.startsWith('+') ? `+${digits}` : stripped;
  return { ok: true, value };
}

export function requirePhone(raw: string | null | undefined): string {
  const parsed = parsePhone(raw);
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value;
}

/** Zod field used by every public and admin form that collects a phone number. */
export const phoneField = z
  .string()
  .superRefine((val, ctx) => {
    const parsed = parsePhone(val);
    if (!parsed.ok) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: parsed.error });
    }
  })
  .transform((val) => {
    const parsed = parsePhone(val);
    return parsed.ok ? parsed.value : val;
  });
