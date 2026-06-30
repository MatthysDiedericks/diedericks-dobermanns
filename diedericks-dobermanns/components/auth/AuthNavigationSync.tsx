import { useRouter, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';

import { Config } from '@/constants/config';
import { getHomeRouteForRole } from '@/lib/auth/routes';
import { useAuthStore } from '@/stores/authStore';
import type { UserRole } from '@/types/app.types';

const ALLOWED_ROLES: UserRole[] = [
  'super_admin',
  'admin',
  'management',
  'trainer',
  'client',
];

const PROTECTED_GROUPS = new Set(['(portal)', '(admin)', '(tabs)', '(trainer)']);

/**
 * Keeps navigation in sync with Supabase auth events — redirects to login on
 * sign-out, blocks protected routes without a session, and away from login
 * when a session is restored.
 */
export function AuthNavigationSync() {
  const router = useRouter();
  const segments = useSegments();
  const initializing = useAuthStore((s) => s.initializing);
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const hadSession = useRef(false);

  useEffect(() => {
    if (initializing || Config.isDemoMode) return;

    const inAuthScreen =
      segments[0] === '(public)' &&
      (segments[1] === 'login' ||
        segments[1] === 'forgot-password' ||
        segments[1] === 'reset-password');

    const inProtectedArea = PROTECTED_GROUPS.has(String(segments[0]));

    if (session) {
      hadSession.current = true;
      if (inAuthScreen && segments[1] !== 'reset-password') {
        const role = profile?.role;
        if (role && ALLOWED_ROLES.includes(role)) {
          router.replace(getHomeRouteForRole(role) as never);
        }
      }
      return;
    }

    if (inProtectedArea || hadSession.current) {
      hadSession.current = false;
      router.replace('/(public)/login');
    }
  }, [initializing, session, profile?.role, segments, router]);

  return null;
}
