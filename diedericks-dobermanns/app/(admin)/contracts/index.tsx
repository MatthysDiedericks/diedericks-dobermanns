import { useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, View } from 'react-native';

import { useContracts } from '@/hooks/useContracts';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { getSignatureSignedUrl } from '@/lib/contracts/uploadSignature';
import { formatKennelDate } from '@/lib/kennel/formatters';

export default function ContractsScreen() {
  const { contracts, templates, loading, error, sendEsign } = useContracts();
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);

  async function viewSignature(storagePath: string) {
    try {
      setSignaturePreview(await getSignatureSignedUrl(storagePath));
    } catch {
      Alert.alert('Could not load signature', 'Please try again.');
    }
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Business" title="Contracts" back={false} />
      {loading ? (
        <Typography variant="body" className="px-6">Loading…</Typography>
      ) : error ? (
        <Typography variant="body" className="px-6 text-danger">{error}</Typography>
      ) : (
        <ScrollView className="px-6 pb-12">
          <Typography variant="label" className="mb-2">Templates</Typography>
          {templates.length === 0 ? (
            <EmptyState title="No templates" message="Contract templates will appear here once seeded." />
          ) : (
            templates.map((t) => (
              <Card key={t.id} className="mb-2">
                <Typography variant="subtitle">{t.name}</Typography>
                <Typography variant="caption">{t.contract_title}</Typography>
              </Card>
            ))
          )}
          <Typography variant="label" className="mb-2 mt-6">Individual contracts</Typography>
          {contracts.map((c) => {
            const signedDate = c.client_signed_at ?? c.signed_at;
            const isSigned = c.signed_by_client || c.status === 'signed_client' || c.status === 'signed_both';
            return (
              <Card key={c.id} className="mb-2">
                <View className="flex-row justify-between">
                  <Typography variant="subtitle">{c.contract_title ?? 'Contract'}</Typography>
                  <Badge label={isSigned ? 'Signed' : (c.status ?? 'draft')} tone={isSigned ? 'success' : 'gold'} />
                </View>
                <Typography variant="caption">
                  {c.client?.full_name ?? '—'} · {c.dog?.name ?? '—'} · {formatKennelDate(c.created_at)}
                </Typography>
                {c.dog?.released_at ? (
                  <Typography variant="caption" className="mt-1 text-silver">
                    Released {formatKennelDate(c.dog.released_at)}
                  </Typography>
                ) : null}
                {signedDate ? (
                  <Typography variant="caption" className="mt-1 text-success">
                    Signed ✓ {formatKennelDate(signedDate)}
                  </Typography>
                ) : null}
                <View className="mt-2 flex-row gap-3">
                  {!isSigned ? (
                    <Button label="Send eSign" size="sm" variant="secondary" onPress={() => sendEsign(c.id)} />
                  ) : null}
                  {c.client_signature_url ? (
                    <Button
                      label="View signature"
                      size="sm"
                      variant="ghost"
                      onPress={() => void viewSignature(c.client_signature_url!)}
                    />
                  ) : null}
                </View>
              </Card>
            );
          })}
        </ScrollView>
      )}

      <Modal visible={!!signaturePreview} transparent animationType="fade" onRequestClose={() => setSignaturePreview(null)}>
        <Pressable className="flex-1 items-center justify-center bg-black/80" onPress={() => setSignaturePreview(null)}>
          {signaturePreview ? (
            <View className="rounded-2xl bg-white p-4">
              <Image source={{ uri: signaturePreview }} style={{ width: 280, height: 120 }} resizeMode="contain" />
            </View>
          ) : null}
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}
