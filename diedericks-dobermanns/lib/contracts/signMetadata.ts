import * as Device from 'expo-device';
import { Platform } from 'react-native';

/**
 * React Native has no browser "user-agent" string, so this builds an
 * equivalent device fingerprint for the signature audit trail instead
 * (model + OS + version) — same purpose, adapted for a native app context.
 */
export function currentDeviceDescription(): string {
  const parts = [
    Device.modelName,
    Platform.OS === 'ios' ? 'iOS' : Platform.OS === 'android' ? 'Android' : Platform.OS,
    Device.osVersion,
  ].filter(Boolean);
  return parts.join(' · ') || 'Unknown device';
}

/**
 * Best-effort client IP lookup for the audit trail. There is no existing IP
 * capture pattern elsewhere in this app and no reliable way to read the
 * client's public IP from React Native directly, so this uses a public
 * lookup service and simply returns null if it fails — signing must never be
 * blocked by this.
 */
export async function bestEffortClientIp(): Promise<string | null> {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    if (!res.ok) return null;
    const json = (await res.json()) as { ip?: string };
    return json.ip ?? null;
  } catch {
    return null;
  }
}
