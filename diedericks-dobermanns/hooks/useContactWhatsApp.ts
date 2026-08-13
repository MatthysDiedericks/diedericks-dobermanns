import { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabase';
import { whatsappUrl } from '@/lib/social';

const CONTACT_WHATSAPP_KEY = 'contact_whatsapp';
const SOCIAL_WHATSAPP_KEY = 'social_whatsapp';

/**
 * Kennel WhatsApp number from app_settings, same source as the website emails.
 * Prefer contact_whatsapp; fall back to social_whatsapp. Empty/missing → null.
 */
export function useContactWhatsApp() {
  const [number, setNumber] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    void supabase
      .from('app_settings')
      .select('key, value')
      .in('key', [CONTACT_WHATSAPP_KEY, SOCIAL_WHATSAPP_KEY])
      .then(({ data }) => {
        const byKey = new Map((data ?? []).map((row) => [row.key, (row.value ?? '').trim()]));
        const raw = byKey.get(CONTACT_WHATSAPP_KEY) || byKey.get(SOCIAL_WHATSAPP_KEY) || '';
        setNumber(raw || null);
      });
  }, []);

  return { number, href: number ? whatsappUrl(number) : null };
}
