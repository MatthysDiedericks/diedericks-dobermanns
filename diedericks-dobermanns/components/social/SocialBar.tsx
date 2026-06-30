import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useAppSettings } from '@/hooks/useAppSettings';
import { openUrl, whatsappUrl } from '@/lib/social';

interface SocialBarProps {
  /** Optional heading shown above the icon row. */
  title?: string;
}

/** Row of gold social icons. All targets come from the app_settings table. */
export function SocialBar({ title }: SocialBarProps) {
  const { settings } = useAppSettings();

  const links: { key: string; icon: keyof typeof Ionicons.glyphMap; url: string | null }[] = [
    {
      key: 'whatsapp',
      icon: 'logo-whatsapp',
      url: settings.whatsapp_number ? whatsappUrl(settings.whatsapp_number) : null,
    },
    { key: 'telegram', icon: 'paper-plane', url: settings.telegram_channel_url },
    { key: 'facebook', icon: 'logo-facebook', url: settings.facebook_page_url },
    { key: 'instagram', icon: 'logo-instagram', url: settings.instagram_url },
    { key: 'youtube', icon: 'logo-youtube', url: settings.youtube_url },
  ];
  const visible = links.filter((l) => !!l.url);
  if (visible.length === 0) return null;

  return (
    <View className="items-center">
      {title ? (
        <Typography variant="label" className="mb-4">
          {title}
        </Typography>
      ) : null}
      <View className="flex-row gap-3">
        {visible.map((l) => (
          <Pressable
            key={l.key}
            onPress={() => openUrl(l.url)}
            className="h-12 w-12 items-center justify-center rounded-full border border-gold/30 bg-black-rich"
          >
            <Ionicons name={l.icon} size={22} color={Colors.gold} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}
