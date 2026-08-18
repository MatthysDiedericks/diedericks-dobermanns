import { ERROR_CODES } from '@/lib/errors/codes';
import { logSecurity } from '@/lib/security/logSecurity';
import { supabase } from '@/lib/supabase';

export const RATE_LIMIT_FALLBACK =
  'Too many attempts — try again in 12 minutes, or WhatsApp us on the number at diedericksdobermanns.com';

export class RateLimitError extends Error {
  constructor(message = RATE_LIMIT_FALLBACK) {
    super(message);
    this.name = 'RateLimitError';
  }
}

export async function blockedMessage(): Promise<string> {
  if (!supabase) return RATE_LIMIT_FALLBACK;
  try {
    const { data } = await supabase.rpc('rate_limit_blocked_message');
    if (typeof data === 'string' && data.trim()) return data;
  } catch {
    /* fall through */
  }
  return RATE_LIMIT_FALLBACK;
}

/**
 * Empty p_key: the database hashes request headers with its own salt.
 * Peek (hit=false) before an insert so the trigger is the one that counts.
 */
export async function checkRateLimit(opts: {
  action: string;
  max: number;
  windowSeconds: number;
  hit?: boolean;
}): Promise<boolean> {
  if (!supabase) return true;
  const { data, error } = await supabase.rpc('check_rate_limit' as never, {
    p_action: opts.action,
    p_key: '',
    p_max: opts.max,
    p_window_seconds: opts.windowSeconds,
    p_hit: opts.hit ?? false,
  } as never);
  if (error) {
    console.error('[checkRateLimit]', error.message);
    return false;
  }
  return data === true;
}

export async function assertRateLimit(
  action: string,
  max: number,
  windowSeconds: number,
): Promise<void> {
  const ok = await checkRateLimit({ action, max, windowSeconds, hit: false });
  if (ok) return;
  if (action === 'signin_failure') {
    logSecurity({
      code: ERROR_CODES.SECURITY_AUTH_LOCKOUT,
      message: 'Sign-in locked after repeated failures',
      route: '/login',
      actorRole: 'anon',
    });
  } else {
    logSecurity({
      code: ERROR_CODES.SECURITY_RATE_LIMIT,
      message: `Rate limit blocked ${action}`,
      detail: { action },
      actorRole: 'anon',
    });
  }
  throw new RateLimitError(await blockedMessage());
}
