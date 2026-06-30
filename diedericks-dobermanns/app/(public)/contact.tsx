import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Linking, Pressable, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';

const CONTACTS = [
  { icon: 'call' as const, label: 'Call', value: '+27 78 215 0832', href: 'tel:+27782150832' },
  {
    icon: 'logo-whatsapp' as const,
    label: 'WhatsApp',
    value: '+27 78 215 0832',
    href: 'https://wa.me/27782150832',
  },
  {
    icon: 'mail' as const,
    label: 'Email',
    value: 'diedericksdobermannssa@gmail.com',
    href: 'mailto:diedericksdobermannssa@gmail.com',
  },
  {
    icon: 'logo-instagram' as const,
    label: 'Instagram',
    value: '@diedericksdobermanns',
    href: 'https://instagram.com/diedericksdobermanns',
  },
];

export default function ContactScreen() {
  const router = useRouter();

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Get In Touch" title="Contact" back={false} />

      <View className="gap-3 px-6">
        {CONTACTS.map((c) => (
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
