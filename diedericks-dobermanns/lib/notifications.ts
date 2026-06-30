import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { Colors } from '@/constants/colors';
import { supabase } from '@/lib/supabase';

/**
 * Notification helpers. Actual delivery (push/email/WhatsApp) happens in
 * Supabase Edge Functions (see supabase/functions). The client only registers
 * push tokens, configures local handling, and invokes those functions; secrets
 * never live on the device.
 */

export interface SendNotificationInput {
  recipientId: string;
  type: 'push' | 'email' | 'whatsapp';
  subject?: string;
  body: string;
}

// Foreground presentation: show a banner + play sound while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/** Android requires an explicit channel for heads-up notifications. */
export async function configureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: Colors.gold,
  });
}

/** Resolves the EAS project id from the Expo config (required for tokens). */
function getProjectId(): string | undefined {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId
  );
}

/**
 * Requests permission, fetches the Expo push token and persists it against the
 * user. Safe to call repeatedly; returns the token or null when unavailable
 * (simulator, denied permission, or demo mode).
 */
export async function registerForPushNotificationsAsync(
  userId: string,
): Promise<string | null> {
  if (!Device.isDevice) return null;
  await configureAndroidChannel();

  const { status: existing } = await Notifications.getPermissionsAsync();
  let status = existing;
  if (existing !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== 'granted') return null;

  try {
    const projectId = getProjectId();
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    const token = tokenResponse.data;
    await savePushToken(userId, token);
    return token;
  } catch {
    return null;
  }
}

/** Persists the device's Expo push token against the current user. */
export async function savePushToken(
  userId: string,
  token: string,
): Promise<void> {
  if (!supabase) return;
  await supabase.from('users').update({ expo_push_token: token }).eq('id', userId);
}

/** Invokes the relevant Edge Function to dispatch a notification. */
export async function sendNotification(
  input: SendNotificationInput,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Notifications require a connected backend.' };

  const { error } = await supabase.functions.invoke('notify', { body: input });
  return { error: error?.message ?? null };
}

/**
 * Broadcasts a notification to every client (admin "send to all" action).
 * The `notify` Edge Function expands `recipientId: 'all'` server-side.
 */
export async function broadcastNotification(
  input: Omit<SendNotificationInput, 'recipientId'>,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Notifications require a connected backend.' };
  const { error } = await supabase.functions.invoke('notify', {
    body: { ...input, recipientId: 'all' },
  });
  return { error: error?.message ?? null };
}
