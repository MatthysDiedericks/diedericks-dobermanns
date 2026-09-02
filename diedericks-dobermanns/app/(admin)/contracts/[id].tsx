import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Linking, ScrollView, Share, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useContracts } from '@/hooks/useContracts';
import { ContractMissingPanel } from '@/components/contracts/ContractNotReadyChip';
import { contractStatusChip, formatEsignExpiry, signingUrl } from '@/lib/contracts/signingLink';

export default function AdminContractDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { contracts, sendEsign } = useContracts();
  const contract = contracts.find((c) => c.id === id);
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

  const chip = contractStatusChip({
    status: contract.status,
    signedByClient: contract.signed_by_client,
    clientSignedAt: contract.client_signed_at,
  });
  const html = `<html><head><meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>body{font-family:Georgia,serif;padding:16px;color:#1a1a1a;background:#fff;font-size:15px;line-height:1.5}</style>
    </head><body>${contract.body_html ?? '<p>No body yet.</p>'}</body></html>`;

  async function handleSend() {
    try {
      const res = await sendEsign(id!);
      if (res.link) {
        Alert.alert('Link ready — nothing emailed', res.link, [
          { text: 'Share', onPress: () => void Share.share({ message: res.link! }) },
          { text: 'Open', onPress: () => void Linking.openURL(res.link!) },
          { text: 'OK' },
        ]);
      }
    } catch (e) {
      Alert.alert('Could not send', e instanceof Error ? e.message : 'Try again');
    }
  }

  return (
    <ScreenContainer scroll={false}>
      <PageHeader eyebrow="Paperwork" title={contract.contract_title ?? 'Agreement'} />
      <View className="px-6 pb-4">
        <Badge label={chip.label} tone={chip.tone} />
        <ContractMissingPanel contract={contract} />
        <Typography variant="caption" className="mt-2">
          {contract.client?.full_name ?? contract.contact?.full_name ?? '—'} · {contract.dog?.name ?? '—'}
        </Typography>
        <Typography variant="caption" className="mt-1 text-silver">
          Editing the body is website-only.
        </Typography>
        {contract.esign_expires_at ? (
          <Typography variant="caption" className="mt-1">
            Link expires {formatEsignExpiry(contract.esign_expires_at)}
          </Typography>
        ) : null}
        <View className="mt-3 flex-row gap-3">
          {!contract.signed_by_client ? (
            <Button label="Send" size="sm" onPress={() => void handleSend()} />
          ) : null}
          {contract.esign_token ? (
            <Button
              label="Open signing link"
              size="sm"
              variant="secondary"
              onPress={() => void Linking.openURL(signingUrl(contract.esign_token!))}
            />
          ) : null}
        </View>
      </View>
      <ScrollView className="flex-1 px-2">
        <View style={{ height: 640 }}>
          <WebView originWhitelist={['*']} source={{ html }} />
        </View>
      </ScrollView>
      <View className="px-6 py-4">
        <Button label="Back" variant="ghost" onPress={() => router.back()} />
      </View>
    </ScreenContainer>
  );
}
