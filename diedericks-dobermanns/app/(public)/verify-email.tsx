import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { subscribeToAuthDeepLinks } from '@/lib/auth/deepLink';
import { useAuthStore } from '@/stores/authStore';

/**
 * Landing screen for the confirmation link sent after sign-up.
 * Supabase redirects here with the session tokens in the URL fragment;
 * subscribeToAuthDeepLinks() picks them up and calls setSession(). Once the
 * session is confirmed, we hand off to /login, whose own effect immediately
 * routes the now-authenticated user to their role's home screen.
 */
export default function VerifyEmailScreen() {
  const router = useRouter();
  const refresh = useAuthStore((s) => s.refresh);
  const [status, setStatus] = useState<'verifying' | 'done' | 'failed'>('verifying');

  useEffect(() => {
    let cancelled = false;

    const finish = (ok: boolean) => {
      if (cancelled) return;
      setStatus(ok ? 'done' : 'failed');
      void refresh().then(() => {
        if (cancelled) return;
        router.replace({
          pathname: '/(public)/login',
          params: ok ? { message: 'Email confirmed — you can now sign in.' } : undefined,
        });
      });
    };

    const unsubscribe = subscribeToAuthDeepLinks(() => finish(true));
    // Fallback: if no deep-link session tokens ever arrive (e.g. link already
    // used or expired), stop showing a spinner forever and send the user to
    // sign in, where a clear "confirm your email" error will show if needed.
    const timeout = setTimeout(() => finish(false), 6000);

    return () => {
      cancelled = true;
      unsubscribe();
      clearTimeout(timeout);
    };
  }, [refresh, router]);

  return (
    <ScreenContainer scroll={false} className="items-center justify-center">
      <View className="items-center px-6">
        <Typography variant="display">
          {status === 'failed' ? 'Link Expired' : 'Confirming Your Email'}
        </Typography>
        <Typography variant="bodyMuted" className="mt-3 text-center">
          {status === 'failed'
            ? 'This confirmation link is no longer valid. Try signing in, or request a new one.'
            : 'One moment while we verify your account…'}
        </Typography>
      </View>
    </ScreenContainer>
  );
}
