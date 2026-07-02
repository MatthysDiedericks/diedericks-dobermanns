import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Linking, Pressable, View } from 'react-native';

import { SocialBar } from '@/components/social/SocialBar';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useAppSettings } from '@/hooks/useAppSettings';
import { openUrl, whatsappUrl } from '@/lib/social';

const FALLBACK_PHONE = '+27 78 215 0832';
const FALLBACK_EMAIL = 'diedericksdobermannssa@gmail.com';

export default function ContactScreen() {
  const router = useRouter();
  const { settings } = useAppSettings();

  const whatsapp = settings.whatsapp_number ?? FALLBACK_PHONE;
  const contacts = [
    {
      icon: 'call' as const,
      label: 'Call',
      value: whatsapp,
      href: `tel:${whatsapp.replace(/\s/g, '')}`,
    },
    {
      icon: 'logo-whatsapp' as const,
      label: 'WhatsApp',
      value: whatsapp,
      href: whatsappUrl(whatsapp),
    },
    {
      icon: 'mail' as const,
      label: 'Email',
      value: FALLBACK_EMAIL,
      href: `mailto:${FALLBACK_EMAIL}`,
    },
    {
      icon: 'logo-instagram' as const,
      label: 'Instagram',
      value: '@diedericksdobermanns',
      href: settings.instagram_url ?? 'https://www.instagram.com/diedericksdobermanns',
    },
    {
      icon: 'logo-facebook' as const,
      label: 'Facebook',
      value: 'Diedericks Dobermanns',
      href: settings.facebook_page_url ?? 'https://www.facebook.com/diedericksdobermanns',
    },
  ].filter((c) => c.href);

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Get In Touch" title="Contact" back={false} />

      <View className="gap-3 px-6">
        {contacts.map((c) => (
          <Pressable key={c.label} onPress={() => Linking.openURL(c.href)}>
            <Card className="flex-row items-center">
              <View className="h-11 w-11 items-center justify-center rounded-full bg-gold/15">
                <Ionicons name={c.icon} size={20} color={Colors.gold} />
              </View>
              <View className="ml-4 flex-1">
                <Typography variant="caption">{c.label}</Typography>
                <Typography variant="subtitle" className="mt-0.5">
                  {c.value}
                </Typography>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.silver} />
            </Card>
          </Pressable>
        ))}

        <View className="mt-4">
          <SocialBar title="Follow us" />
        </View>

        {settings.telegram_channel_url ? (
          <Pressable onPress={() => openUrl(settings.telegram_channel_url)}>
            <Typography variant="caption" className="text-center text-gold underline">
              Join our Telegram channel
            </Typography>
          </Pressable>
        ) : null}
        {settings.youtube_url ? (
          <Pressable onPress={() => openUrl(settings.youtube_url)}>
            <Typography variant="caption" className="text-center text-gold underline">
              Watch on YouTube
            </Typography>
          </Pressable>
        ) : null}
      </View>

      <View className="mt-8 px-6">
        <Card>
          <Typography variant="display">Start an Application</Typography>
          <Typography variant="bodyMuted" className="mt-2">
            The fastest way to begin is to complete our online application.
          </Typography>
          <Button
            label="Apply Now"
            onPress={() => router.push('/apply')}
            fullWidth
            className="mt-4"
          />
        </Card>

        <View className="mt-6 flex-row flex-wrap gap-x-4 gap-y-2">
          <Pressable onPress={() => router.push('/privacy')}>
            <Typography variant="caption" className="text-gold underline">
              Privacy Policy
            </Typography>
          </Pressable>
          <Pressable onPress={() => router.push('/terms')}>
            <Typography variant="caption" className="text-gold underline">
              Terms & Conditions
            </Typography>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}
