import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';

export default function AdminSettingsIndex() {
  const router = useRouter();

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Admin" title="Settings" back={false} />
      <View className="gap-3 px-6">
        <Card className="p-4">
          <Typography variant="subtitle" className="text-gold">
            Social & contact links
          </Typography>
          <Typography variant="bodyMuted" className="mt-2">
            Instagram, Facebook, WhatsApp, Telegram, YouTube — shown on the public contact page.
          </Typography>
          <Button
            label="Edit social links"
            variant="outline"
            onPress={() => router.push('/(admin)/settings/social')}
            fullWidth
            className="mt-4"
          />
        </Card>
        <Card className="p-4">
          <Typography variant="subtitle" className="text-gold">
            Notifications
          </Typography>
          <Button
            label="Broadcast & test"
            variant="outline"
            onPress={() => router.push('/(admin)/notifications')}
            fullWidth
            className="mt-4"
          />
        </Card>
      </View>
    </ScreenContainer>
  );
}
