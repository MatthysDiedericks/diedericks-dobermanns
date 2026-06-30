import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { Pressable, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { APP_TERMS_META, APP_TERMS_SECTIONS } from '@/lib/appTerms';
import { LEGAL_URLS } from '@/lib/legalUrls';

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

export default function TermsScreen() {
  const router = useRouter();

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Legal" title="Terms & Conditions" back />
      <View className="px-6 pb-10">
        <Typography variant="bodyMuted" className="mb-2 text-sm">
          Effective: {APP_TERMS_META.effectiveDate} · Last updated: {APP_TERMS_META.lastUpdated}
        </Typography>
        <Typography variant="caption" className="mb-4 text-silver">
          {APP_TERMS_META.application} · {APP_TERMS_META.bundleId}
        </Typography>

        <Pressable
          onPress={() => void WebBrowser.openBrowserAsync(LEGAL_URLS.terms)}
          className="mb-2"
        >
          <Typography variant="caption" className="text-gold underline">
            View published version on website →
          </Typography>
        </Pressable>
        <Pressable onPress={() => router.push('/terms-of-sale')} className="mb-6">
          <Typography variant="caption" className="text-silver underline">
            Puppy purchase terms (Terms & Conditions of Sale) →
          </Typography>
        </Pressable>

        {APP_TERMS_SECTIONS.map((section) => (
          <Section key={section.title} title={section.title}>
            <Typography variant="body">{section.body}</Typography>
          </Section>
        ))}
      </View>
    </ScreenContainer>
  );
}
