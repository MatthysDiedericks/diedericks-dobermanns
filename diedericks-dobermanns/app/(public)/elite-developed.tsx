import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { EliteDevelopedBody } from '@/components/programmes/EliteDevelopedBody';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useContactWhatsApp } from '@/hooks/useContactWhatsApp';
import {
  ELITE_DEVELOPED_TAGLINE,
  ELITE_DEVELOPED_TITLE,
  ELITE_WHATSAPP_PREFILL,
} from '@/lib/content/eliteDeveloped';
import { openWhatsApp } from '@/lib/social';

export default function EliteDevelopedScreen() {
  const router = useRouter();
  const { number } = useContactWhatsApp();

  return (
    <ScreenContainer>
      <PageHeader eyebrow="The Programme" title={ELITE_DEVELOPED_TITLE} />
      <Typography variant="subtitle" className="mb-8 px-6 text-gold">
        {ELITE_DEVELOPED_TAGLINE}
      </Typography>
      <EliteDevelopedBody />
      <View className="mx-6 mb-10 rounded-2xl border border-gold/20 bg-black-rich p-6">
        <Typography variant="label" className="text-center">
          Ready to begin?
        </Typography>
        <View className="mt-4 gap-3">
          <Button label="Apply for a puppy" onPress={() => router.push('/apply')} fullWidth />
          {number ? (
            <Button
              label="Speak to us on WhatsApp"
              variant="outline"
              onPress={() => openWhatsApp(number, ELITE_WHATSAPP_PREFILL)}
              fullWidth
            />
          ) : null}
        </View>
      </View>
    </ScreenContainer>
  );
}
