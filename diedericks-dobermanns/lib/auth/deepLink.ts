import * as Linking from 'expo-linking';

import { supabase } from '@/lib/supabase';

const AUTH_DEEP_LINK_PATHS = [
  'reset-password',
  'auth/reset-password',
  'verify-email',
  'auth/verify-email',
] as const;

/** Returns true when the URL is an expected Supabase auth callback for this app. */
function isAllowedAuthDeepLink(url: string): boolean {
  try {
    const parsed = Linking.parse(url);
    const path = (parsed.path ?? '').replace(/^\//, '');
    return AUTH_DEEP_LINK_PATHS.some((p) => path === p || path.endsWith(`/${p}`));
  } catch {
    return false;
  }
}

/** Parses Supabase auth tokens from a deep-link URL and sets the session. */
export async function createSessionFromUrl(url: string): Promise<boolean> {
  if (!supabase) return false;
  if (!isAllowedAuthDeepLink(url)) return false;

  const hashIndex = url.indexOf('#');
  const queryIndex = url.indexOf('?');
  const paramString =
    hashIndex >= 0 ? url.slice(hashIndex + 1) : queryIndex >= 0 ? url.slice(queryIndex + 1) : '';

  if (!paramString) return false;

  const params = new URLSearchParams(paramString);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    return !error;
  }

  const code = params.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return !error;
  }

  return false;
}

/** Subscribes to incoming deep links and restores Supabase auth sessions. */
export function subscribeToAuthDeepLinks(
  onSessionRestored: () => void,
): () => void {
  const handle = (url: string) => {
    void createSessionFromUrl(url).then((ok) => {
      if (ok) onSessionRestored();
    });
  };

  void Linking.getInitialURL().then((url) => {
    if (url) handle(url);
  });

  const sub = Linking.addEventListener('url', ({ url }) => handle(url));
  return () => sub.remove();
}
