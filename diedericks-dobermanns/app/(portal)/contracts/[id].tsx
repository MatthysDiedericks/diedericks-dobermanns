import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useContracts } from '@/hooks/usePortal';
import { useGuestAccess } from '@/hooks/useGuestAccess';
import { signingUrl } from '@/lib/contracts/signingLink';
import { Config } from '@/constants/config';

export default function ContractDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: contracts } = useContracts();
  const guest = useGuestAccess();
  const contract = contracts.find((c) => c.id === id);
  const isSigned = Boolean(
    contract?.signed_by_client || contract?.status === 'signed_client' || contract?.status === 'signed_both',
  );
  const token = (contract as { esign_token?: string | null } | undefined)?.esign_token;
  const body = (contract as { body_html?: string | null } | undefined)?.body_html;
  const html = `<html><head><meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>body{font-family:Georgia,serif;padding:16px;color:#1a1a1a;background:#fff;font-size:15px;line-height:1.5}</style>
    </head><body>${body ?? '<p>Your agreement will appear here once it is sent.</p>'}</body></html>`;

  async function openSigning() {
    const url = token
      ? signingUrl(token)
      : `${Config.app.webBaseUrl}/portal/contracts/${id}`;
    await WebBrowser.openBrowserAsync(url);
  }

  if (!contract) {
    return (
      <ScreenContainer>
        <PageHeader title="Contract" />
        <Typography variant="bodyMuted" className="px-6">
          Contract not found.
        </Typography>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll={false}>
      <PageHeader eyebrow="Paperwork" title={contract.contract_title ?? 'Agreement'} />
      <View className="flex-1 px-4 pb-8">
        <Card className="mb-3 p-4">
          {isSigned ? (
            <Typography variant="body" className="text-success">
              Signed
              {contract.client_signed_at ?? contract.signed_at
                ? ` ${new Date((contract.client_signed_at ?? contract.signed_at)!).toLocaleDateString()}`
                : ''}
            </Typography>
          ) : (
            <Typography variant="bodyMuted">
              Tick each clause, then type your name to confirm. Opens in the browser — the same
              signing page as WhatsApp.
            </Typography>
          )}
          {!isSigned && !guest.isGuest ? (
            <Button label="Review & accept" onPress={() => void openSigning()} fullWidth className="mt-3" />
          ) : null}
          {guest.isGuest && !isSigned ? (
            <Typography variant="bodyMuted" className="mt-3">
              Only {guest.holderName ?? 'the account holder'} can accept this agreement.
            </Typography>
          ) : null}
        </Card>
        <View className="flex-1 overflow-hidden rounded-lg">
          <WebView originWhitelist={['*']} source={{ html }} />
        </View>
        <Button label="Back" variant="ghost" onPress={() => router.back()} fullWidth className="mt-4" />
      </View>
    </ScreenContainer>
  );
}
