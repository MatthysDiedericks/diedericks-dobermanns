import { ERROR_CODES } from '@/lib/errors/codes';
import { logError } from '@/lib/errors/logError';
import { supabase } from '@/lib/supabase';

export type ClaimCounts = {
  applications: number;
  quotes: number;
  waitlist: number;
  contracts: number;
};

/**
 * Links applications / quotes / waitlist / contracts raised against the
 * caller's confirmed email. Takes no arguments — never pass a user-supplied email.
 * Safe to call repeatedly; failures must not block sign-in.
 */
export async function claimMyRecords(): Promise<ClaimCounts> {
  const empty: ClaimCounts = {
    applications: 0,
    quotes: 0,
    waitlist: 0,
    contracts: 0,
  };
  if (!supabase) return empty;
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      void logError({
        code: ERROR_CODES.PORTAL_CLAIM_FAILED,
        area: 'portal',
        severity: 'error',
        message: userError?.message ?? 'claim_my_records called with no session',
        detail: { reason: 'no_session' },
        actorRole: 'anon',
        surface: 'app',
        route: '/claim',
      });
      return empty;
    }

    const { data, error } = await supabase.rpc('claim_my_records');
    if (error) {
      void logError({
        code: ERROR_CODES.PORTAL_CLAIM_FAILED,
        area: 'portal',
        severity: 'error',
        message: error.message,
        detail: { reason: 'rpc_error', code: error.code },
        actorRole: 'client',
        actorId: user.id,
        email: user.email,
        surface: 'app',
        route: '/claim',
      });
      return empty;
    }

    const row = Array.isArray(data) ? data[0] : data;
    return {
      applications: Number(row?.applications ?? 0) || 0,
      quotes: Number(row?.quotes ?? 0) || 0,
      waitlist: Number(row?.waitlist ?? 0) || 0,
      contracts: Number(row?.contracts ?? 0) || 0,
    };
  } catch (err) {
    console.error('[claimMyRecords]', err);
    void logError({
      code: ERROR_CODES.PORTAL_CLAIM_FAILED,
      area: 'portal',
      severity: 'error',
      message: err instanceof Error ? err.message : 'claim failed',
      detail: { reason: 'exception' },
      surface: 'app',
      route: '/claim',
    });
    return empty;
  }
}
