/**
 * Centralised app configuration and feature flags.
 * Reads from public Expo env vars (prefixed EXPO_PUBLIC_).
 */
export const Config = {
  app: {
    name: 'Diedericks Dobermanns',
    slogan: 'Born With Purpose. Built With Discipline.',
  },
  supabase: {
    url: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
    anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  },
  /**
   * When Supabase credentials are absent the app runs in demo mode against
   * local mock data so the UI can be developed and reviewed without a backend.
   */
  get isDemoMode(): boolean {
    return !this.supabase.url || !this.supabase.anonKey;
  },
} as const;
