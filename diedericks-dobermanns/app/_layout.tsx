import '@/global.css';

import { Platform } from 'react-native';

// Apply dark class to the HTML root for NativeWind web dark mode (class strategy).
// Guard with try/catch — document may not exist during SSR or Expo web cold start.
try {
  if (Platform.OS === 'web' && typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.classList.add('dark');
  }
} catch {
  // Silently ignore — dark mode will apply on next render cycle
}

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthNavigationSync } from '@/components/auth/AuthNavigationSync';
import { DevSwitcher } from '@/components/dev/DevSwitcher';
import { Colors } from '@/constants/colors';
import { AppFonts } from '@/constants/fonts';
import {
  configureAndroidChannel,
  registerForPushNotificationsAsync,
} from '@/lib/notifications';
import { initSentry } from '@/lib/sentry';
import { useAuthStore } from '@/stores/authStore';

initSentry();

export { ErrorBoundary } from '@/components/ui/RouteErrorBoundary';

SplashScreen.preventAutoHideAsync().catch(() => {
  /* ignore — splash may already be hidden */
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(AppFonts);
  const initialize = useAuthStore((s) => s.initialize);
  const initializing = useAuthStore((s) => s.initializing);
  const userId = useAuthStore((s) => s.session?.user.id);

  useEffect(() => {
    initialize();
    configureAndroidChannel().catch(() => undefined);
  }, [initialize]);

  // Register every authenticated device (client or admin) for push.
  useEffect(() => {
    if (userId) {
      registerForPushNotificationsAsync(userId).catch(() => undefined);
    }
  }, [userId]);

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  if (initializing) {
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.black }}>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <View className="flex-1 items-center justify-center bg-[#111008]">
            <ActivityIndicator size="large" color={Colors.gold} />
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.black }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <StatusBar style="light" />
          <AuthNavigationSync />
          <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: Colors.black },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(public)" />
          <Stack.Screen name="(portal)" />
          <Stack.Screen name="(admin)" />
          <Stack.Screen name="(trainer)" />
          <Stack.Screen name="auth" options={{ presentation: 'modal' }} />
        </Stack>
        {__DEV__ ? <DevSwitcher /> : null}
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
