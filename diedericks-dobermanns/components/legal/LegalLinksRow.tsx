import * as WebBrowser from 'expo-web-browser';
import { Linking, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { Typography } from '@/components/ui/Typography';
import { LEGAL_URLS } from '@/lib/legalUrls';

interface Props {
  /** Open published website URLs (App Store / sign-up compliance). */
  useWebsiteUrls?: boolean;
  /** Also show in-app screens alongside website links. */
  showInApp?: boolean;
}

export function LegalLinksRow({ useWebsiteUrls = false, showInApp = !useWebsiteUrls }: Props) {
  const router = useRouter();

  const openTerms = () => {
    if (useWebsiteUrls) void WebBrowser.openBrowserAsync(LEGAL_URLS.terms);
    else router.push('/terms');
  };

  const openPrivacy = () => {
    if (useWebsiteUrls) void WebBrowser.openBrowserAsync(LEGAL_URLS.privacyPolicy);
    else router.push('/privacy');
  };

  return (
    <View className="flex-row flex-wrap items-center justify-center gap-x-1 gap-y-1">
      <Pressable onPress={openPrivacy}>
        <Typography variant="caption" className="text-gold underline">
          Privacy Policy
        </Typography>
      </Pressable>
      <Typography variant="caption" className="text-subtle">
        ·
      </Typography>
      <Pressable onPress={openTerms}>
        <Typography variant="caption" className="text-gold underline">
          Terms & Conditions
        </Typography>
      </Pressable>
      {showInApp && useWebsiteUrls ? (
        <>
          <Typography variant="caption" className="text-subtle">
            ·
          </Typography>
          <Pressable onPress={() => router.push('/privacy')}>
            <Typography variant="caption" className="text-silver underline">
              In-app
            </Typography>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

/** Sign-up consent line with tappable legal links (website URLs for store compliance). */
export function SignUpLegalNotice() {
  return (
    <View className="mt-4">
      <Typography variant="caption" className="text-center text-subtle">
        By creating an account, you agree to our Terms & Conditions and Privacy Policy.
      </Typography>
      <LegalLinksRow useWebsiteUrls />
    </View>
  );
}

/** Settings legal section — opens published URLs. */
export function SettingsLegalSection() {
  return (
    <View className="gap-3">
      <Pressable onPress={() => void WebBrowser.openBrowserAsync(LEGAL_URLS.terms)}>
        <Typography variant="body" className="text-gold">
          Terms & Conditions
        </Typography>
      </Pressable>
      <Pressable onPress={() => void WebBrowser.openBrowserAsync(LEGAL_URLS.privacyPolicy)}>
        <Typography variant="body" className="text-gold">
          Privacy Policy
        </Typography>
      </Pressable>
      <Pressable
        onPress={() =>
          void Linking.openURL(`${LEGAL_URLS.website}/contact`)
        }
      >
        <Typography variant="caption" className="text-silver underline">
          Support & contact →
        </Typography>
      </Pressable>
    </View>
  );
}
