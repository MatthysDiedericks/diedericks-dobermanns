/** Public-form bot signals. Field names are deliberately ordinary. */

export const TRAP_FIELD = 'company_url';
export const OPENED_FIELD = 'form_opened_at';
export const APPLICATION_MIN_MS = 15_000;

export function trapFilled(value: string | null | undefined): boolean {
  return Boolean(value && value.trim());
}

export function isTooFast(openedAtMs: number | null | undefined, minMs = APPLICATION_MIN_MS): boolean {
  if (openedAtMs == null || !Number.isFinite(openedAtMs)) return false;
  return Date.now() - openedAtMs < minMs;
}
