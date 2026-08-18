/**
 * Stable error codes for error_events. Ours — never the provider's wording.
 * Keep values identical in diedericksdobermann-web/src/lib/errors/codes.ts.
 */
export const ERROR_CODES = {
  AUTH_PASSWORD_POLICY: 'AUTH_PASSWORD_POLICY',
  AUTH_REGISTRATION_BLOCKED: 'AUTH_REGISTRATION_BLOCKED',
  AUTH_SIGNUP_PHANTOM: 'AUTH_SIGNUP_PHANTOM',
  AUTH_RATE_LIMIT: 'AUTH_RATE_LIMIT',
  AUTH_EMAIL_DELIVERY: 'AUTH_EMAIL_DELIVERY',
  AUTH_SIGNUP_OTHER: 'AUTH_SIGNUP_OTHER',
  QUOTE_TOTAL_MISMATCH: 'QUOTE_TOTAL_MISMATCH',
  QUOTE_LINE_DROPPED: 'QUOTE_LINE_DROPPED',
  INVOICE_TOTAL_MISMATCH: 'INVOICE_TOTAL_MISMATCH',
  PAYMENT_OVER_ALLOCATED: 'PAYMENT_OVER_ALLOCATED',
  UPLOAD_OBJECT_MISSING: 'UPLOAD_OBJECT_MISSING',
  CONTRACT_SIGN_FAILED: 'CONTRACT_SIGN_FAILED',
  CHECKIN_NOT_CONTACTABLE: 'CHECKIN_NOT_CONTACTABLE',
  PORTAL_CLAIM_FAILED: 'PORTAL_CLAIM_FAILED',
  APP_SCREEN_CRASH: 'APP_SCREEN_CRASH',
  SECURITY_RATE_LIMIT: 'SECURITY_RATE_LIMIT',
  SECURITY_HONEYPOT: 'SECURITY_HONEYPOT',
  SECURITY_UPLOAD_REJECTED: 'SECURITY_UPLOAD_REJECTED',
  SECURITY_AUTH_LOCKOUT: 'SECURITY_AUTH_LOCKOUT',
  SECURITY_RPC_DENIED: 'SECURITY_RPC_DENIED',
  SECURITY_TOKEN_INVALID: 'SECURITY_TOKEN_INVALID',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export type ErrorArea =
  | 'auth'
  | 'quote'
  | 'invoice'
  | 'payment'
  | 'contract'
  | 'upload'
  | 'portal'
  | 'admin'
  | 'app'
  | 'other';

export type ErrorSeverity = 'warning' | 'error' | 'critical';

export type ErrorSurface = 'website' | 'app' | 'server' | 'script';

/** Codes that page Matt immediately (deduped per hour in the edge function). */
export const IMMEDIATE_ALERT_CODES: ReadonlySet<string> = new Set([
  ERROR_CODES.AUTH_SIGNUP_PHANTOM,
  ERROR_CODES.AUTH_REGISTRATION_BLOCKED,
  ERROR_CODES.QUOTE_TOTAL_MISMATCH,
  ERROR_CODES.QUOTE_LINE_DROPPED,
  ERROR_CODES.SECURITY_AUTH_LOCKOUT,
]);

/** Rate-limit events alert only when more than this many land in one hour. */
export const SECURITY_RATE_LIMIT_ALERT_THRESHOLD = 20;

export function isImmediateAlert(code: string, severity: ErrorSeverity, area: ErrorArea): boolean {
  if (IMMEDIATE_ALERT_CODES.has(code)) return true;
  return area === 'payment' && severity === 'critical';
}
