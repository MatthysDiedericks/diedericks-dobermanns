import type { Session } from '@supabase/supabase-js';

import { supabase } from '@/lib/supabase';
import { CLIENT_PROFILE_SELECT } from '@/lib/auth/profileSelect';
import type { AppUser } from '@/types/app.types';

/**
 * Auth helpers wrapping Supabase Auth. All functions are safe to call in demo
 * mode — they resolve with a clear, user-facing error instead of crashing.
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
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error?.message ?? null };
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
      options: { data: { full_name: fullName } },
    });

    if (error) {
      // Extract message from any error shape Supabase might return
      const msg =
        typeof error.message === 'string' && error.message.trim() && error.message !== '{}'
          ? error.message
          : 'Sign up failed. Please try again or contact support.';
      console.error('[signUpWithEmail]', error);
      return { error: msg };
    }

    // Supabase returns user=null when the email already exists but is unconfirmed
    if (!data.user) {
      return { error: 'This email may already be registered. Try signing in or check your inbox for a confirmation email.' };
    }

    return { error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'An unexpected error occurred.';
    console.error('[signUpWithEmail] threw:', e);
    return { error: msg };
  }
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
