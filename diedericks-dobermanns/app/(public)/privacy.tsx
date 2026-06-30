import * as WebBrowser from 'expo-web-browser';
import { Pressable, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { LEGAL_URLS } from '@/lib/legalUrls';
import { PRIVACY_META, PRIVACY_SECTIONS } from '@/lib/privacy';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-6">
      <Typography variant="subtitle" className="mb-2 text-gold">
        {title}
      </Typography>
      {children}
    </View>
  );
}

export default function PrivacyPolicyScreen() {
  return (
    <ScreenContainer>
      <PageHeader eyebrow="Legal" title="Privacy Policy" back />
      <View className="px-6 pb-10">
        <Typography variant="bodyMuted" className="mb-2 text-sm">
          Effective: {PRIVACY_META.effectiveDate} · Last updated: {PRIVACY_META.lastUpdated}
        </Typography>
        <Typography variant="caption" className="mb-4 text-silver">
          {PRIVACY_META.application} · {PRIVACY_META.bundleId}
        </Typography>

        <Pressable
          onPress={() => void WebBrowser.openBrowserAsync(LEGAL_URLS.privacyPolicy)}
          className="mb-6"
        >
          <Typography variant="caption" className="text-gold underline">
            View published version on website →
          </Typography>
        </Pressable>

        {PRIVACY_SECTIONS.map((section) => (
          <Section key={section.title} title={section.title}>
            <Typography variant="body">{section.body}</Typography>
          </Section>
        ))}
      </View>
    </ScreenContainer>
  );
}
