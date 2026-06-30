import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { Pressable, View } from 'react-native';

import { SettingsLegalSection } from '@/components/legal/LegalLinksRow';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { openAccountDeletionRequest } from '@/lib/accountDeletion';
import { LEGAL_URLS } from '@/lib/legalUrls';
import { useAuthStore } from '@/stores/authStore';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
const BUILD_NUMBER =
  Constants.expoConfig?.ios?.buildNumber ??
  Constants.expoConfig?.android?.versionCode?.toString() ??
  '1';

const LINKS = [
  { label: 'Genetic Forecast', href: '/(tabs)/genetics' },
  { label: 'Social settings', href: '/(admin)/settings/social' },
  { label: 'Legacy admin dashboard', href: '/(admin)/dashboard' },
  { label: 'Marketing', href: '/(admin)/marketing' },
] as const;

export default function SettingsScreen() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  return (
    <ScreenContainer>
      <PageHeader eyebrow="App" title="Settings" back={false} />
      <View className="gap-3 px-6">
        {LINKS.map((l) => (
          <Pressable key={l.href} onPress={() => router.push(l.href as never)}>
            <Card>
              <Typography variant="body" className="text-gold">
                {l.label}
              </Typography>
            </Card>
          </Pressable>
        ))}

        <Card className="mt-2">
          <Typography variant="label" className="mb-3 text-gold">
            Legal
          </Typography>
          <SettingsLegalSection />
        </Card>

        <Card>
          <Typography variant="label" className="mb-2 text-gold">
            Account
          </Typography>
          <Pressable onPress={openAccountDeletionRequest}>
            <Typography variant="body" className="text-danger">
              Request account deletion
            </Typography>
          </Pressable>
          <Typography variant="caption" className="mt-2 text-subtle">
            Opens email to {LEGAL_URLS.contactEmail} with subject &quot;Account Deletion Request&quot;
          </Typography>
        </Card>

        <Card>
          <Typography variant="caption" className="text-silver">
            Version {APP_VERSION} ({BUILD_NUMBER})
          </Typography>
          <Typography variant="caption" className="mt-1 text-subtle">
            {LEGAL_URLS.contactEmail}
          </Typography>
        </Card>

        <Button
          label="Sign out"
          onPress={() => {
            void logout().then(() => router.replace('/(public)/login'));
          }}
          className="mt-6"
          fullWidth
          variant="secondary"
        />
      </View>
    </ScreenContainer>
  );
}
