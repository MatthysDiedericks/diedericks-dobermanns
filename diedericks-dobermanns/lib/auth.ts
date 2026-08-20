import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import { CLIENT_PROFILE_SELECT } from '@/lib/auth/profileSelect';
import type { AppUser } from '@/types/app.types';

/**
 * Auth helpers wrapping Supabase Auth. All functions are safe to call in demo
 * mode — they resolve with a clear, user-facing error instead of crashing.
 *
 * Portal invites sign in on the website (`/portal/auth/confirm` + verifyOtp
 * token_hash). Do not add a second magic-link path in the app.
 */

export interface AuthResult {
  error: string | null;
}

const DEMO_ERROR =
  'Authentication requires a connected backend. Add Supabase credentials to .env.';

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<AuthResult> {
  if (!supabase) return { error: DEMO_ERROR };
  const { assertRateLimit, blockedMessage, checkRateLimit, RateLimitError } = await import(
    '@/lib/security/rateLimit'
  );
  try {
    await assertRateLimit('signin_failure', 10, 900);
  } catch (e) {
    return {
      error: e instanceof RateLimitError ? e.message : await blockedMessage(),
    };
  }
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    await checkRateLimit({ action: 'signin_failure', max: 10, windowSeconds: 900, hit: true });
    return { error: error.message };
  }
  return { error: null };
}

export async function signUpWithEmail(
  email: string,
  password: string,
  fullName: string,
): Promise<AuthResult> {
  if (!supabase) return { error: DEMO_ERROR };
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        // No longer the primary confirmation path (see verifySignupOtp) — the
        // client now types the 6-digit code from the email instead of tapping
        // a link. Left in place as a fallback for anyone who clicks the link
        // anyway (verify-email.tsx still handles it) and because Supabase
        // requires some redirect URL to be configured regardless.
        emailRedirectTo: 'diedericksdobermanns://verify-email',
      },
    });

    if (error) {
      // Extract message from any error shape Supabase might return
      const msg =
        typeof error.message === 'string' && error.message.trim() && error.message !== '{}'
          ? error.message
          : 'Sign up failed. Please try again or contact support.';
      console.error('[signUpWithEmail]', error);
      const lower = msg.toLowerCase();
      let specific = 'AUTH_SIGNUP_OTHER';
      if (
        (lower.includes('password') &&
          (lower.includes('character') || lower.includes('length') || lower.includes('weak'))) ||
        lower.includes('weak_password')
      ) {
        specific = 'AUTH_PASSWORD_POLICY';
      } else if (lower.includes('rate') || lower.includes('limit')) {
        specific = 'AUTH_RATE_LIMIT';
      } else if (lower.includes('email') || lower.includes('smtp') || lower.includes('mail')) {
        specific = 'AUTH_EMAIL_DELIVERY';
      }
      void import('@/lib/auth/logSignupFailure').then(({ logSignupFailure }) =>
        logSignupFailure({ errorCode: specific, email }),
      );
      void import('@/lib/errors/logError').then(({ logError }) =>
        logError({
          code: 'AUTH_REGISTRATION_BLOCKED',
          area: 'auth',
          severity: 'error',
          message: msg,
          detail: { specific_code: specific },
          email,
          actorRole: 'anon',
          surface: 'app',
          route: '/sign-up',
        }),
      );
      return { error: msg };
    }

    // Empty identities = email already registered (enumeration protection).
    // Do not confirm existence — same generic message as the website.
    if (
      data.user &&
      Array.isArray(data.user.identities) &&
      data.user.identities.length === 0
    ) {
      return {
        error:
          'If that address already has an account, sign in or reset your password.',
      };
    }

    // Form claimed success but no user — critical phantom signup.
    if (!data.user) {
      void import('@/lib/errors/logError').then(({ logError }) =>
        logError({
          code: 'AUTH_SIGNUP_PHANTOM',
          area: 'auth',
          severity: 'critical',
          message: 'signUp reported success without creating a user',
          email,
          actorRole: 'anon',
          surface: 'app',
          route: '/sign-up',
        }),
      );
      return {
        error:
          'Something went wrong creating your account. Try again, or WhatsApp us and we will help.',
      };
    }

    return { error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'An unexpected error occurred.';
    console.error('[signUpWithEmail] threw:', e);
    void import('@/lib/errors/logError').then(({ logError }) =>
      logError({
        code: 'AUTH_REGISTRATION_BLOCKED',
        area: 'auth',
        severity: 'error',
        message: msg,
        email,
        actorRole: 'anon',
        surface: 'app',
        route: '/sign-up',
      }),
    );
    return { error: msg };
  }
}

/** Confirms a brand-new account's email using the 6-digit code from the signup email. */
export async function verifySignupOtp(email: string, token: string): Promise<AuthResult> {
  if (!supabase) return { error: DEMO_ERROR };
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'signup' });
  return { error: error?.message ?? null };
}

/** Sends a fresh signup confirmation code/link to the given email. */
export async function resendSignupOtp(email: string): Promise<AuthResult> {
  if (!supabase) return { error: DEMO_ERROR };
  const { error } = await supabase.auth.resend({ type: 'signup', email });
  return { error: error?.message ?? null };
}

export async function sendPasswordReset(email: string): Promise<AuthResult> {
  if (!supabase) return { error: DEMO_ERROR };
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: 'diedericksdobermanns://reset-password',
  });
  return { error: error?.message ?? null };
}

export async function updatePassword(newPassword: string): Promise<AuthResult> {
  if (!supabase) return { error: DEMO_ERROR };
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  return { error: error?.message ?? null };
}

export async function signOut(): Promise<AuthResult> {
  if (!supabase) return { error: null };
  const { error } = await supabase.auth.signOut();
  return { error: error?.message ?? null };
}

export async function getCurrentSession(): Promise<Session | null> {
  if (!supabase) return null;
  // getSession() returns the cached token. If it's expired, actively refresh it
  // before returning so callers always get a valid JWT or null.
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session) return null;

  const nowSecs = Math.floor(Date.now() / 1000);
  const expiresAt = session.expires_at ?? 0;
  // Refresh if token expires within 60 seconds
  if (expiresAt - nowSecs < 60) {
    const { data: refreshData, error } = await supabase.auth.refreshSession();
    if (error || !refreshData.session) {
      // Refresh failed — session is truly expired, user must sign in again
      console.warn('[getCurrentSession] Token refresh failed:', error?.message);
      return null;
    }
    return refreshData.session;
  }
  return session;
}

/** Maps a raw public.users row to AppUser. Extracted so retry logic can reuse it. */
function buildAppUser(userId: string, profile: Record<string, unknown>): AppUser {
  return {
    id: userId,
    full_name: profile.full_name as string,
    phone: profile.phone as string | null,
    country: profile.country as string | null,
    city: profile.city as string | null,
    address: (profile.address as string | null) ?? null,
    whatsapp_number: (profile.whatsapp_number as string | null) ?? null,
    dog_experience: (profile.dog_experience as string | null) ?? null,
    current_pets: (profile.current_pets as string | null) ?? null,
    has_children: (profile.has_children as boolean | null) ?? null,
    property_type: (profile.property_type as string | null) ?? null,
    has_fencing: (profile.has_fencing as boolean | null) ?? null,
    purpose: Array.isArray(profile.purpose)
      ? (profile.purpose as string[])
      : typeof profile.purpose === 'string'
        ? [profile.purpose]
        : null,
    emergency_contact_name: (profile.emergency_contact_name as string | null) ?? null,
    emergency_contact_phone: (profile.emergency_contact_phone as string | null) ?? null,
    emergency_contact_relationship: (profile.emergency_contact_relationship as string | null) ?? null,
    vet_practice: (profile.vet_practice as string | null) ?? null,
    vet_name: (profile.vet_name as string | null) ?? null,
    vet_phone: (profile.vet_phone as string | null) ?? null,
    profile_completed_at: (profile.profile_completed_at as string | null) ?? null,
    role: profile.role as AppUser['role'],
    avatar_url: profile.avatar_url as string | null,
    marketing_opt_in: (profile.marketing_opt_in as boolean | null) ?? false,
    created_at: (profile.created_at as string) ?? '',
    updated_at: (profile.updated_at as string) ?? '',
  };
}

/**
 * Loads role and profile fields from public.users for the current session.
 * Never reads Supabase Auth session role (JWT "authenticated" claim).
 */
export async function fetchUserProfile(userId: string): Promise<AppUser | null> {
  if (!supabase) return null;

  // Do NOT call getCurrentSession() here. The Supabase client already holds
  // the active JWT internally and will attach it automatically to this query.
  // Re-calling getSession() inside the onAuthStateChange flow can hit a timing
  // window where getSession() returns null before the JWT is written to storage,
  // causing the query to run as anon (no auth.uid()), which RLS then blocks.
  const { data: profile, error } = await supabase
    .from('users')
    .select(CLIENT_PROFILE_SELECT)
    .eq('id', userId)
    .single();

  if (error || !profile) {
    // PGRST303 = JWT expired mid-session. Refresh the token and retry once.
    if (error?.code === 'PGRST303' && supabase) {
      console.warn('[fetchUserProfile] JWT expired — attempting token refresh…');
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (!refreshError && refreshData.session) {
        // Retry the profile fetch after successful refresh
        const { data: retryProfile, error: retryError } = await supabase
          .from('users')
          .select(CLIENT_PROFILE_SELECT)
          .eq('id', userId)
          .single();
        if (!retryError && retryProfile) {
          return buildAppUser(userId, retryProfile);
        }
      }
    }
    // Always log — this error is always actionable regardless of build mode
    console.error('[fetchUserProfile] Failed to load public.users profile:', {
      userId,
      error: error?.message ?? 'no row returned',
      code: error?.code,
    });
    return null;
  }

  return buildAppUser(userId, profile as Record<string, unknown>);
}
