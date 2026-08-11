import { Linking } from 'react-native';

/** Digits for WhatsApp deep links. Do not change stored numbers. */
export function toWhatsAppDigits(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('0') && digits.length === 10) {
    digits = `27${digits.slice(1)}`;
  }
  return digits;
}

/** One-tap: try native WhatsApp scheme, fall back to wa.me. Does not send. */
export async function openWhatsAppDraft(
  phone: string | null | undefined,
  text: string,
): Promise<boolean> {
  const digits = toWhatsAppDigits(phone);
  if (!digits) return false;
  const encoded = encodeURIComponent(text);
  const native = `whatsapp://send?phone=${digits}&text=${encoded}`;
  const web = `https://wa.me/${digits}?text=${encoded}`;
  try {
    const can = await Linking.canOpenURL(native);
    await Linking.openURL(can ? native : web);
    return true;
  } catch {
    try {
      await Linking.openURL(web);
      return true;
    } catch {
      return false;
    }
  }
}
