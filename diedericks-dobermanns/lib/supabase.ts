import 'react-native-url-polyfill/auto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { Config } from '@/constants/config';
import type { AppDatabase } from '@/types/appDatabase';
import { SecureStorageAdapter } from '@/lib/secureStorage';

/**
 * Supabase client singleton.
 *
 * Returns `null` in demo mode (no credentials configured) so the rest of the
 * app can gracefully fall back to mock data. Always guard usage with
 * `requireSupabase()` or a null check.
 */
function createSupabaseClient(): SupabaseClient<AppDatabase> | null {
  if (Config.isDemoMode) {
    if (__DEV__) {
      console.warn(
        '[supabase] Running in demo mode — set EXPO_PUBLIC_SUPABASE_URL and ' +
          'EXPO_PUBLIC_SUPABASE_ANON_KEY in .env to connect a real backend.',
      );
    }
    return null;
  }

  return createClient<AppDatabase>(Config.supabase.url, Config.supabase.anonKey, {
    auth: {
      storage: SecureStorageAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

export const supabase = createSupabaseClient();

/** Returns the client or throws — use when an operation truly requires a backend. */
export function requireSupabase(): SupabaseClient<AppDatabase> {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured. Add credentials to .env to enable this feature.',
    );
  }
  return supabase;
}
