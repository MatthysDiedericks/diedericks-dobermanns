import { Ionicons } from '@expo/vector-icons';
import type { ErrorBoundaryProps } from 'expo-router';
import { usePathname } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { appErrorMeta } from '@/lib/errors/appMeta';
import { logError } from '@/lib/errors/logError';

/**
 * Branded fallback for Expo Router error boundaries. Re-export the `ErrorBoundary`
 * name from a layout file to protect that whole route segment, e.g.:
 *
 *   export { ErrorBoundary } from '@/components/ui/RouteErrorBoundary';
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const screen = usePathname();

  useEffect(() => {
    const meta = appErrorMeta(screen);
    void logError({
      code: 'APP_SCREEN_CRASH',
      area: 'app',
      severity: 'error',
      message: 'Screen error',
      route: meta.screen,
      surface: 'app',
      detail: meta,
    });
  }, [error, screen]);

  return (
    <ScreenContainer scroll={false} className="items-center justify-center px-8">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-danger/15">
        <Ionicons name="alert-circle" size={32} color={Colors.danger} />
      </View>
      <Typography variant="display" className="mt-6 text-center">
        Something went wrong
      </Typography>
      <Typography variant="bodyMuted" className="mt-3 text-center">
        An unexpected error occurred while loading this screen. Please try again.
      </Typography>

      {__DEV__ ? (
        <View className="mt-4 w-full rounded-xl border border-danger/30 bg-black-rich p-4">
          <Typography variant="caption" className="text-danger">
            {error.message}
          </Typography>
        </View>
      ) : null}

      <Button label="Try Again" onPress={retry} className="mt-8" />
    </ScreenContainer>
  );
}
