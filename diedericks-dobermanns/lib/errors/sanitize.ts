/** Keys that must never appear in error_events.detail (case-insensitive). */
export const FORBIDDEN_DETAIL_KEY = /pass|token|secret|otp|key|id_number/i;

export function assertDetailSafe(detail: unknown): void {
  if (detail == null || typeof detail !== 'object' || Array.isArray(detail)) {
    return;
  }
  for (const key of Object.keys(detail as Record<string, unknown>)) {
    if (FORBIDDEN_DETAIL_KEY.test(key)) {
      throw new Error(`error_events.detail must not contain key "${key}"`);
    }
  }
}

/** Strip forbidden keys rather than throw — logging must never break the user path. */
export function sanitizeDetail(
  detail: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!detail) return null;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(detail)) {
    if (FORBIDDEN_DETAIL_KEY.test(key)) continue;
    if (value != null && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = sanitizeDetail(value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out;
}

export function emailDomainOnly(email: string | null | undefined): string | null {
  if (!email) return null;
  const at = email.trim().lastIndexOf('@');
  if (at < 0) return 'unknown';
  return email.trim().slice(at + 1).toLowerCase() || 'unknown';
}
