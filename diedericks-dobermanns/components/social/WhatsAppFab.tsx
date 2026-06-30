import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';

import { useAppSettings } from '@/hooks/useAppSettings';
import { openWhatsApp } from '@/lib/social';

/** Floating "Contact us on WhatsApp" action, anchored bottom-right. */
export function WhatsAppFab() {
  const { settings } = useAppSettings();
  if (!settings.whatsapp_number) return null;

  return (
    <Pressable
      onPress={() => openWhatsApp(settings.whatsapp_number, 'Hi Diedericks Dobermanns, ')}
      style={{ position: 'absolute', right: 16, bottom: 92 }}
      className="h-14 w-14 items-center justify-center rounded-full bg-gold shadow-lg"
    >
      <Ionicons name="logo-whatsapp" size={26} color="#0A0A0A" />
    </Pressable>
  );
}
