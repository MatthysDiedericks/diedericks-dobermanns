import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { LoginForm } from '@/components/auth/LoginForm';
import { LoginLogo } from '@/components/auth/LoginLogo';
import { LegalLinksRow } from '@/components/legal/LegalLinksRow';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useAuth } from '@/hooks/useAuth';
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

export default function LoginScreen() {
  const router = useRouter();
  const { message } = useLocalSearchParams<{ message?: string }>();
  const { signIn, isLoading } = useAuth();
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const initializing = useAuthStore((s) => s.initializing);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    if (initializing || !session) return;
    const role = profile?.role;
    if (role && ALLOWED_ROLES.includes(role)) {
      router.replace(getHomeRouteForRole(role) as never);
    }
  }, [initializing, session, profile?.role, router]);

  async function onSubmit(email: string, password: string) {
    setServerError(null);
    try {
      await signIn(email, password);
      const role = useAuthStore.getState().profile?.role;
      if (!role || !ALLOWED_ROLES.includes(role)) {
        await useAuthStore.getState().logout();
        setServerError('Access not permitted for this account.');
        return;
      }
      router.replace(getHomeRouteForRole(role) as never);
    } catch (e) {
      setServerError(e instanceof Error ? e.message : 'Sign in failed.');
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#111008' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenContainer keyboardShouldPersistTaps="handled" className="bg-[#111008]">
        <View className="px-6 pt-16">
          <LoginLogo />

          <Typography variant="display" className="mt-10">
            Sign In
          </Typography>
          <Typography variant="bodyMuted" className="mb-8 mt-2">
            Access your portal, training tools, or admin dashboard.
          </Typography>

          {message ? (
            <View className="mb-4 rounded-xl border border-gold/30 bg-gold/5 px-4 py-3">
              <Typography variant="caption" className="text-gold">
                {message}
              </Typography>
            </View>
          ) : null}

          <LoginForm
            onSubmit={onSubmit}
            onForgotPassword={() => router.push('/(public)/forgot-password')}
            loading={isLoading}
            serverError={serverError}
          />

          <Pressable
            onPress={() => router.push('/(public)/sign-up')}
            className="mt-6 items-center"
          >
            <Typography variant="label" className="text-gold">
              Don't have an account? Sign Up
            </Typography>
          </Pressable>

          <View className="mt-8 pb-8">
            <LegalLinksRow />
          </View>
        </View>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}
