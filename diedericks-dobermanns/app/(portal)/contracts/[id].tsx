import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Linking, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { SignaturePad } from '@/components/contracts/SignaturePad';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useContracts } from '@/hooks/usePortal';
import { signContract } from '@/hooks/useMutations';
import { bestEffortClientIp, currentDeviceDescription } from '@/lib/contracts/signMetadata';
import { getSignatureSignedUrl, uploadSignature } from '@/lib/contracts/uploadSignature';
import { useAuthStore } from '@/stores/authStore';

export default function ContractDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: contracts, refetch } = useContracts();
  const contract = contracts.find((c) => c.id === id);
  const userId = useAuthStore((s) => s.session?.user.id);
  const [signing, setSigning] = useState(false);
  const [justSignedPreview, setJustSignedPreview] = useState<string | null>(null);
  const [savedSignatureUrl, setSavedSignatureUrl] = useState<string | null>(null);

  const isSigned = Boolean(
    contract?.signed_by_client || contract?.status === 'signed_client' || contract?.status === 'signed_both',
  );

  useEffect(() => {
    if (justSignedPreview || !contract?.client_signature_url) return;
    let cancelled = false;
    getSignatureSignedUrl(contract.client_signature_url)
      .then((url) => {
        if (!cancelled) setSavedSignatureUrl(url);
      })
      .catch(() => {
        if (!cancelled) setSavedSignatureUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [contract?.client_signature_url, justSignedPreview]);

  async function handleSignature(base64Png: string) {
    if (!contract || !userId) return;
    setSigning(true);
    try {
      const storagePath = await uploadSignature(base64Png, userId, contract.id);
      const [ip] = await Promise.all([bestEffortClientIp()]);
      const { error } = await signContract(contract.id, {
        signatureStoragePath: storagePath,
        device: currentDeviceDescription(),
        ip,
      });
      if (error) throw new Error(error);
      setJustSignedPreview(`data:image/png;base64,${base64Png}`);
      await refetch();
    } catch (e) {
      Alert.alert('Could not sign', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setSigning(false);
    }
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
    <ScreenContainer>
      <PageHeader eyebrow="Paperwork" title="Sign Contract" />
      <View className="px-6 pb-12">
        <Card className="p-4">
          <Typography variant="subtitle">{contract.contract_title ?? contract.notes ?? 'Contract document'}</Typography>
          {contract.document_url ? (
            <Button
              label="View full document"
              variant="outline"
              onPress={() => Linking.openURL(contract.document_url)}
              fullWidth
              className="mt-4"
            />
          ) : (
            <Typography variant="bodyMuted" className="mt-4">
              Your document is being prepared — check back shortly.
            </Typography>
          )}
        </Card>

        {isSigned ? (
          <View className="mt-6">
            <Typography variant="body" className="text-success">
              Signed on{' '}
              {contract.client_signed_at ?? contract.signed_at
                ? new Date((contract.client_signed_at ?? contract.signed_at)!).toLocaleDateString()
                : '—'}
            </Typography>
            {justSignedPreview || savedSignatureUrl ? (
              <Card className="mt-3 items-center bg-white p-3">
                <Image
                  source={{ uri: justSignedPreview ?? savedSignatureUrl ?? undefined }}
                  style={{ width: 220, height: 90 }}
                  resizeMode="contain"
                />
                {!justSignedPreview ? (
                  <Typography variant="caption" className="mt-2 text-silver">
                    Signature on file
                  </Typography>
                ) : null}
              </Card>
            ) : null}
          </View>
        ) : (
          <View className="mt-6">
            <Typography variant="bodyMuted" className="mb-3">
              Please review the full document above, then sign below to confirm your agreement.
            </Typography>
            <SignaturePad onConfirm={handleSignature} confirming={signing} />
          </View>
        )}

        <Button label="Back" variant="ghost" onPress={() => router.back()} fullWidth className="mt-6" />
      </View>
    </ScreenContainer>
  );
}
