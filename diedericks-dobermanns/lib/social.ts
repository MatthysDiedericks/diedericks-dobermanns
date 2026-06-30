import { Linking } from 'react-native';

import type { AppSettings } from '@/types/app.types';

/**
 * Maps the normalised AppSettings object onto the live `app_settings` key/value
 * rows. Keep in sync with the Phase 9 spec (Task 7) key names.
 */
export const SOCIAL_SETTING_KEYS: Record<keyof AppSettings, string> = {
  whatsapp_number: 'social_whatsapp',
  whatsapp_community_url: 'whatsapp_community_url',
  telegram_channel_url: 'social_telegram',
  facebook_page_url: 'social_facebook',
  instagram_url: 'social_instagram',
  youtube_url: 'social_youtube',
};

/** Strips everything but digits so a phone number is safe for wa.me links. */
export function sanitizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '');
}

/**
 * Builds a universal WhatsApp link (works on web, iOS and Android, opening the
 * app when installed). Optionally pre-fills a message body.
 */
export function whatsappUrl(phone: string, text?: string): string {
  const base = `https://wa.me/${sanitizePhone(phone)}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

/** Opens an external URL/app link, ignoring empty values and failures. */
export function openUrl(url?: string | null): void {
  if (!url) return;
  Linking.openURL(url).catch(() => {});
}

/** Opens a direct 1-on-1 WhatsApp chat with a greeting. */
export function openWhatsApp(phone?: string | null, text?: string): void {
  if (!phone) return;
  openUrl(whatsappUrl(phone, text));
}
