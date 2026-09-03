/**
 * Stable error codes for error_events. Ours — never the provider's wording.
 * Keep values identical in diedericksdobermann-web/src/lib/errors/codes.ts.
 */
export const ERROR_CODES = {
  AUTH_PASSWORD_POLICY: "AUTH_PASSWORD_POLICY",
  AUTH_REGISTRATION_BLOCKED: "AUTH_REGISTRATION_BLOCKED",
  AUTH_SIGNUP_PHANTOM: "AUTH_SIGNUP_PHANTOM",
  AUTH_RATE_LIMIT: "AUTH_RATE_LIMIT",
  AUTH_EMAIL_DELIVERY: "AUTH_EMAIL_DELIVERY",
  AUTH_SIGNUP_OTHER: "AUTH_SIGNUP_OTHER",
  QUOTE_TOTAL_MISMATCH: "QUOTE_TOTAL_MISMATCH",
  QUOTE_LINE_DROPPED: "QUOTE_LINE_DROPPED",
  INVOICE_TOTAL_MISMATCH: "INVOICE_TOTAL_MISMATCH",
  PAYMENT_OVER_ALLOCATED: "PAYMENT_OVER_ALLOCATED",
  UPLOAD_OBJECT_MISSING: "UPLOAD_OBJECT_MISSING",
  CONTRACT_SIGN_FAILED: "CONTRACT_SIGN_FAILED",
  CHECKIN_NOT_CONTACTABLE: "CHECKIN_NOT_CONTACTABLE",
  PORTAL_CLAIM_FAILED: "PORTAL_CLAIM_FAILED",
  PAGE_RENDER: "PAGE_RENDER",
  APP_SCREEN_CRASH: "APP_SCREEN_CRASH",
  SECURITY_RATE_LIMIT: "SECURITY_RATE_LIMIT",
  SECURITY_HONEYPOT: "SECURITY_HONEYPOT",
  SECURITY_UPLOAD_REJECTED: "SECURITY_UPLOAD_REJECTED",
  SECURITY_AUTH_LOCKOUT: "SECURITY_AUTH_LOCKOUT",
  SECURITY_RPC_DENIED: "SECURITY_RPC_DENIED",
  SECURITY_TOKEN_INVALID: "SECURITY_TOKEN_INVALID",
  PAYMENT_PROOF_UPLOADED: "PAYMENT_PROOF_UPLOADED",
  APPLY_VALIDATION_FAILED: "APPLY_VALIDATION_FAILED",
  APPLY_HONEYPOT: "APPLY_HONEYPOT",
  APPLY_TOO_FAST: "APPLY_TOO_FAST",
  APPLY_RATE_LIMITED: "APPLY_RATE_LIMITED",
  APPLY_UPLOAD_FAILED: "APPLY_UPLOAD_FAILED",
  APPLY_DB_ERROR: "APPLY_DB_ERROR",
  APPLY_UNHANDLED: "APPLY_UNHANDLED",
  QUOTE_VALIDATION_FAILED: "QUOTE_VALIDATION_FAILED",
  QUOTE_SAVE_FAILED: "QUOTE_SAVE_FAILED",
  QUOTE_SEND_FAILED: "QUOTE_SEND_FAILED",
  QUOTE_UNHANDLED: "QUOTE_UNHANDLED",
  ADMIN_QUERY_FAILED: "ADMIN_QUERY_FAILED",
  INVITE_SEND_FAILED: "INVITE_SEND_FAILED",
  INVITE_EXPIRED_USED: "INVITE_EXPIRED_USED",
  INVITE_EXPIRED: "INVITE_EXPIRED",
  INVITE_USED: "INVITE_USED",
  INVITE_CODE_WRONG: "INVITE_CODE_WRONG",
  INVITE_NONE_ISSUED: "INVITE_NONE_ISSUED",
  INVITE_SCANNER_CONSUMED: "INVITE_SCANNER_CONSUMED",
  INVITE_UNHANDLED: "INVITE_UNHANDLED",
  /**
   * `/portal/auth/confirm` serves two different links: our own 7-day invite
   * (`?invite=`) and a Supabase magic link from `/portal/login` (`?token_hash=`).
   * Logging both as INVITE_* sends whoever reads System Health to the invite
   * system when the invite system is fine. Keep them apart.
   */
  SIGNIN_LINK_EXPIRED: "SIGNIN_LINK_EXPIRED",
  SIGNIN_LINK_USED: "SIGNIN_LINK_USED",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export type ErrorArea =
  | "auth"
  | "quote"
  | "invoice"
  | "payment"
  | "contract"
  | "upload"
  | "portal"
  | "admin"
  | "app"
  | "other";

export type ErrorSeverity = "warning" | "error" | "critical";

export type ErrorSurface = "website" | "app" | "server" | "script";

/**
 * Severity belongs to the code. A missing key is a compile error — never a
 * silent default to "error" that puts a mistyped invite in the failure digest.
 */
export const CODE_SEVERITY: Record<ErrorCode, ErrorSeverity> = {
  AUTH_PASSWORD_POLICY: "warning",
  AUTH_REGISTRATION_BLOCKED: "warning",
  AUTH_SIGNUP_PHANTOM: "error",
  AUTH_RATE_LIMIT: "warning",
  AUTH_EMAIL_DELIVERY: "error",
  AUTH_SIGNUP_OTHER: "error",
  QUOTE_TOTAL_MISMATCH: "critical",
  QUOTE_LINE_DROPPED: "error",
  INVOICE_TOTAL_MISMATCH: "critical",
  PAYMENT_OVER_ALLOCATED: "critical",
  UPLOAD_OBJECT_MISSING: "error",
  CONTRACT_SIGN_FAILED: "error",
  CHECKIN_NOT_CONTACTABLE: "warning",
  PORTAL_CLAIM_FAILED: "error",
  PAGE_RENDER: "error",
  APP_SCREEN_CRASH: "error",
  SECURITY_RATE_LIMIT: "warning",
  SECURITY_HONEYPOT: "warning",
  SECURITY_UPLOAD_REJECTED: "warning",
  SECURITY_AUTH_LOCKOUT: "critical",
  SECURITY_RPC_DENIED: "critical",
  SECURITY_TOKEN_INVALID: "warning",
  PAYMENT_PROOF_UPLOADED: "warning",
  APPLY_VALIDATION_FAILED: "warning",
  APPLY_HONEYPOT: "warning",
  APPLY_TOO_FAST: "warning",
  APPLY_RATE_LIMITED: "warning",
  APPLY_UPLOAD_FAILED: "error",
  APPLY_DB_ERROR: "error",
  APPLY_UNHANDLED: "error",
  QUOTE_VALIDATION_FAILED: "warning",
  QUOTE_SAVE_FAILED: "error",
  QUOTE_SEND_FAILED: "error",
  QUOTE_UNHANDLED: "error",
  ADMIN_QUERY_FAILED: "error",
  INVITE_SEND_FAILED: "error",
  INVITE_EXPIRED_USED: "warning",
  INVITE_EXPIRED: "warning",
  INVITE_USED: "warning",
  INVITE_CODE_WRONG: "warning",
  INVITE_NONE_ISSUED: "warning",
  INVITE_SCANNER_CONSUMED: "warning",
  INVITE_UNHANDLED: "error",
  SIGNIN_LINK_EXPIRED: "warning",
  SIGNIN_LINK_USED: "warning",
};

/** Codes that page Matt immediately (deduped per hour in the edge function). */
export const IMMEDIATE_ALERT_CODES: ReadonlySet<string> = new Set([
  ERROR_CODES.AUTH_SIGNUP_PHANTOM,
  ERROR_CODES.QUOTE_TOTAL_MISMATCH,
  ERROR_CODES.QUOTE_LINE_DROPPED,
  ERROR_CODES.SECURITY_AUTH_LOCKOUT,
  ERROR_CODES.PAYMENT_PROOF_UPLOADED,
  ERROR_CODES.APPLY_DB_ERROR,
  ERROR_CODES.APPLY_UNHANDLED,
  ERROR_CODES.QUOTE_SAVE_FAILED,
  ERROR_CODES.QUOTE_UNHANDLED,
]);

/** Rate-limit events alert only when more than this many land in one hour. */
export const SECURITY_RATE_LIMIT_ALERT_THRESHOLD = 20;

export function isImmediateAlert(code: string, severity: ErrorSeverity, area: ErrorArea): boolean {
  if (IMMEDIATE_ALERT_CODES.has(code)) return true;
  return area === "payment" && severity === "critical";
}
