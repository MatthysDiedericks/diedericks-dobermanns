import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { SettingsLegalSection } from '@/components/legal/LegalLinksRow';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useTrainerStats } from '@/hooks/useTrainer';
import { useAuthStore } from '@/stores/authStore';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';

export default function TrainerProfileScreen() {
  const router = useRouter();
  const profile = useAuthStore((s) => s.profile);
  const email = useAuthStore((s) => s.session?.user.email);
  const logout = useAuthStore((s) => s.logout);
  const { weekCount, lifetimeCompleted, loading } = useTrainerStats();

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Account" title="Profile" back={false} />

      <View className="gap-3 px-6">
        <Card>
          <Typography variant="subtitle">{profile?.full_name ?? 'Trainer'}</Typography>
          <Typography variant="caption" className="mt-1">
            {email ?? '—'}
          </Typography>
        </Card>

        <Card>
          <Typography variant="label" className="mb-2 text-gold">
            Stats
          </Typography>
          <View className="flex-row justify-between">
            <Typography variant="bodyMuted">This week</Typography>
            <Typography variant="body">{loading ? '…' : weekCount} sessions</Typography>
          </View>
          <View className="mt-2 flex-row justify-between border-t border-gold/10 pt-2">
            <Typography variant="bodyMuted">Lifetime completed</Typography>
            <Typography variant="subtitle" className="text-gold">
              {loading ? '…' : lifetimeCompleted}
            </Typography>
          </View>
        </Card>

        <Card>
          <Typography variant="label" className="mb-3 text-gold">
            Legal
          </Typography>
          <SettingsLegalSection />
        </Card>

        <Card>
          <Typography variant="caption" className="text-silver">
            Version {APP_VERSION}
          </Typography>
        </Card>

        <Button
          label="Sign out"
          onPress={() => {
            void logout().then(() => router.replace('/(public)/login'));
          }}
          variant="outline"
          fullWidth
          className="mt-2"
        />
      </View>
    </ScreenContainer>
  );
}
