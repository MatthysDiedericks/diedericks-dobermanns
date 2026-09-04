import type { User } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';

/**
 * Verified identity for the Expo app.
 *
 * React `cache()` only deduplicates inside one Next.js server request. This
 * client has no such boundary, so we keep the last `getUser()` result in
 * memory and only call the auth server again when that result is missing or
 * older than STALE_MS. Overlapping callers share one in-flight request.
 *
 * Still `getUser()`, never `getSession()`. The cookie/storage token is not
 * treated as proof of identity.
 */
const STALE_MS = 30_000;

let verified: User | null = null;
let verifiedAt = 0;
let inflight: Promise<User | null> | null = null;

export async function getCachedUser(): Promise<User | null> {
  if (!supabase) return null;
  if (verified && Date.now() - verifiedAt < STALE_MS) return verified;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      verified = user ?? null;
      verifiedAt = Date.now();
      return verified;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** After signInWithPassword / verifyOtp — those responses are already verified. */
export function rememberVerifiedUser(user: User | null | undefined): void {
  verified = user ?? null;
  verifiedAt = user ? Date.now() : 0;
  inflight = null;
}

export function clearCachedUser(): void {
  verified = null;
  verifiedAt = 0;
  inflight = null;
}
