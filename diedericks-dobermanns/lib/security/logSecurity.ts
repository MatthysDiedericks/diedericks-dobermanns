import { ERROR_CODES, type ErrorArea } from '@/lib/errors/codes';
import { logError } from '@/lib/errors/logError';

const AREA: Record<string, ErrorArea> = {
  [ERROR_CODES.SECURITY_RATE_LIMIT]: 'other',
  [ERROR_CODES.SECURITY_HONEYPOT]: 'other',
  [ERROR_CODES.SECURITY_UPLOAD_REJECTED]: 'upload',
  [ERROR_CODES.SECURITY_AUTH_LOCKOUT]: 'auth',
  [ERROR_CODES.SECURITY_RPC_DENIED]: 'admin',
  [ERROR_CODES.SECURITY_TOKEN_INVALID]: 'other',
};

export function logSecurity(input: {
  code: string;
  message: string;
  detail?: Record<string, unknown> | null;
  route?: string | null;
  actorRole?: 'anon' | 'client' | 'admin' | 'system' | null;
}): void {
  const code = String(input.code);
  void logError({
    code,
    area: AREA[code] ?? 'other',
    severity: code === ERROR_CODES.SECURITY_AUTH_LOCKOUT ? 'error' : 'warning',
    message: input.message,
    detail: input.detail ?? null,
    route: input.route,
    surface: 'app',
    actorRole: input.actorRole ?? 'anon',
  });
}
