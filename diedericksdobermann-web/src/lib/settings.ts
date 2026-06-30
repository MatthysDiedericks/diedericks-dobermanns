import { createClient } from "@/lib/supabase/server";

/** Known app_settings keys used across the site. */
export const SETTINGS_KEYS = {
  heroImage: "hero_image_url",
  logo: "logo_url",
  appStore: "app_store_url",
  playStore: "play_store_url",
  instagram: "social_instagram",
  facebook: "social_facebook",
  whatsapp: "social_whatsapp",
  whatsappCommunity: "whatsapp_community_url",
  telegram: "social_telegram",
  youtube: "social_youtube",
  email: "contact_email",
  phone: "contact_phone",
  address: "contact_address",
  mapsEmbed: "maps_embed_url",
} as const;

export type SettingsMap = Record<string, string>;

/** Loads all app_settings rows into a key/value map (server-side). */
export async function getSettings(): Promise<SettingsMap> {
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("key, value");
  const map: SettingsMap = {};
  (data ?? []).forEach((row) => {
    if (row.value) map[row.key] = row.value;
  });
  return map;
}

/** Builds a wa.me link from a stored phone/number. */
export function whatsappLink(number?: string, text?: string) {
  if (!number) return null;
  const digits = number.replace(/[^\d]/g, "");
  if (!digits) return null;
  const base = `https://wa.me/${digits}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
