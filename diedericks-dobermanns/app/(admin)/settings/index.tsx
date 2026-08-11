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
            Pricing
          </Typography>
          <Typography variant="bodyMuted" className="mt-2">
            Set prices for Standard Puppy, Elite Developed Puppy and Fully Trained Protection
            Dog — shown on the website and used to auto-generate quotes.
          </Typography>
          <Button
            label="Manage pricing"
            variant="outline"
            onPress={() => router.push('/(admin)/settings/pricing')}
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
        <Card className="p-4">
          <Typography variant="subtitle" className="text-gold">
            Analytics
          </Typography>
          <Button
            label="Website traffic"
            variant="outline"
            onPress={() => router.push('/(admin)/analytics')}
            fullWidth
            className="mt-4"
          />
        </Card>
        <Card className="p-4">
          <Typography variant="subtitle" className="text-gold">
            Audit log
          </Typography>
          <Typography variant="bodyMuted" className="mt-2">
            Who changed what — dogs, prices, invoices, contracts.
          </Typography>
          <Button
            label="Open audit log"
            variant="outline"
            onPress={() => router.push('/(admin)/audit')}
            fullWidth
            className="mt-4"
          />
        </Card>
      </View>
    </ScreenContainer>
  );
}
