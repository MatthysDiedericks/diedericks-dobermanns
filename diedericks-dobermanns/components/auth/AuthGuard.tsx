import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { Config } from '@/constants/config';
import { useAuthStore } from '@/stores/authStore';
import type { UserRole } from '@/types/app.types';

interface AuthGuardProps {
  /** When provided, the user must hold one of these roles. */
  roles?: UserRole[];
  children: React.ReactNode;
}

/**
 * Gates a route group behind authentication (and optionally a role).
 * In demo mode (no backend) access is granted so the UI remains reviewable.
 * Production access is always additionally enforced by Supabase RLS.
 */
export function AuthGuard({ roles, children }: AuthGuardProps) {
  const initializing = useAuthStore((s) => s.initializing);
  const profileLoading = useAuthStore((s) => s.profileLoading);
  const session = useAuthStore((s) => s.session);
  const profile = useAuthStore((s) => s.profile);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());
  const hasRole = useAuthStore((s) => s.hasRole);

  if (Config.isDemoMode) return <>{children}</>;

  const waitingForProfile = Boolean(roles?.length && session && profileLoading);

  if (initializing || waitingForProfile) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <ActivityIndicator color={Colors.gold} />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(public)/login" />;
  }

  if (roles?.length && session && !profile) {
    return (
      <View className="flex-1 items-center justify-center bg-black px-8">
        <Typography variant="display" className="text-center">
          Access Restricted
        </Typography>
        <Typography variant="bodyMuted" className="mt-3 text-center">
          Could not load your user profile. Check that your account exists in the kennel database.
        </Typography>
      </View>
    );
  }

  if (roles && !hasRole(...roles)) {
    return (
      <View className="flex-1 items-center justify-center bg-black px-8">
        <Typography variant="display" className="text-center">
          Access Restricted
        </Typography>
        <Typography variant="bodyMuted" className="mt-3 text-center">
          Your account doesn&apos;t have permission to view this area.
        </Typography>
      </View>
    );
  }

  return <>{children}</>;
}
