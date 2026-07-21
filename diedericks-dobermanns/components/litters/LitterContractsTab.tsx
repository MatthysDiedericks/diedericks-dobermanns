import { useRef, useState } from 'react';
import { Alert, Image, Modal, Pressable, View } from 'react-native';

import {
  CreateLitterContractSheet,
  type CreateLitterContractSheetHandle,
} from '@/components/litters/CreateLitterContractSheet';
import { LitterReleaseSection } from '@/components/litters/LitterReleaseSection';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Typography } from '@/components/ui/Typography';
import { useLitterContracts, type LitterContractRow } from '@/hooks/useLitterContracts';
import { getSignatureSignedUrl } from '@/lib/contracts/uploadSignature';
import { titleCase } from '@/lib/format';
import { formatKennelDate } from '@/lib/kennel/formatters';
import type { Dog } from '@/types/app.types';

function contractStatus(contract: LitterContractRow): { label: string; tone: BadgeTone } {
  if (contract.signed_by_client || contract.status === 'signed_client' || contract.status === 'signed_both') {
    return { label: 'Signed', tone: 'success' };
  }
  if (contract.status === 'sent') return { label: 'Sent', tone: 'gold' };
  if (contract.status === 'void') return { label: 'Void', tone: 'danger' };
  return { label: 'Draft', tone: 'muted' };
}

function canSendEsign(contract: LitterContractRow): boolean {
  return !contract.signed_by_client && contract.status !== 'signed_client' && contract.status !== 'signed_both';
}

export function LitterContractsTab({
  litterId,
  puppies,
}: {
  litterId: string;
  puppies: Dog[];
}) {
  const sheetRef = useRef<CreateLitterContractSheetHandle>(null);
  const puppyIds = puppies.map((p) => p.id);
  const { contracts, loading, createContract, sendEsign, refresh } = useLitterContracts(litterId, puppyIds);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);

  async function handleSend(id: string) {
    try {
      await sendEsign(id);
      Alert.alert('Sent', 'E-sign link has been prepared for this contract.');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not send e-sign');
    }
  }

  async function viewSignature(storagePath: string) {
    try {
      const url = await getSignatureSignedUrl(storagePath);
      setSignaturePreview(url);
    } catch {
      Alert.alert('Could not load signature', 'Please try again.');
    }
  }

  return (
    <View className="pb-8">
      <LitterReleaseSection puppies={puppies} onReleased={refresh} />

      <Button
        label="+ Create Contract"
        onPress={() => sheetRef.current?.open()}
        fullWidth
        className="mb-4"
        disabled={puppies.length === 0}
      />

      {loading ? (
        <Typography variant="bodyMuted">Loading contracts…</Typography>
      ) : contracts.length === 0 ? (
        <EmptyState title="No contracts for this litter yet" message="Create a draft when a puppy is reserved or sold." />
      ) : (
        <View className="gap-3">
          {contracts.map((c) => {
            const status = contractStatus(c);
            const signedDate = c.client_signed_at ?? c.signed_at;
            return (
              <Card key={c.id}>
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-2">
                    <Typography variant="subtitle">{c.dog?.name ?? 'Puppy'}</Typography>
                    {c.dog?.colour ? (
                      <Typography variant="caption" className="text-silver">
                        {titleCase(c.dog.colour.replace('_', ' '))}
                      </Typography>
                    ) : null}
                    <Typography variant="caption" className="mt-1">
                      {c.client?.full_name ?? 'Client'}
                    </Typography>
                    {c.client?.phone ? (
                      <Typography variant="caption" className="text-silver">
                        {c.client.phone}
                      </Typography>
                    ) : null}
                    <Typography variant="bodyMuted" className="mt-2">
                      {c.contract_title ?? 'Purchase agreement'}
                    </Typography>
                    {signedDate ? (
                      <Typography variant="caption" className="mt-1 text-success">
                        Signed ✓ {formatKennelDate(signedDate)}
                      </Typography>
                    ) : null}
                  </View>
                  <Badge label={status.label} tone={status.tone} />
                </View>
                <View className="mt-3 flex-row gap-3">
                  {canSendEsign(c) ? (
                    <Button label="Send eSign" variant="secondary" size="sm" onPress={() => void handleSend(c.id)} />
                  ) : null}
                  {c.client_signature_url ? (
                    <Button
                      label="View signature"
                      variant="ghost"
                      size="sm"
                      onPress={() => void viewSignature(c.client_signature_url!)}
                    />
                  ) : null}
                </View>
              </Card>
            );
          })}
        </View>
      )}

      <CreateLitterContractSheet ref={sheetRef} puppies={puppies} onCreate={createContract} />

      <Modal visible={!!signaturePreview} transparent animationType="fade" onRequestClose={() => setSignaturePreview(null)}>
        <Pressable
          className="flex-1 items-center justify-center bg-black/80"
          onPress={() => setSignaturePreview(null)}
        >
          {signaturePreview ? (
            <View className="rounded-2xl bg-white p-4">
              <Image source={{ uri: signaturePreview }} style={{ width: 280, height: 120 }} resizeMode="contain" />
            </View>
          ) : null}
        </Pressable>
      </Modal>
    </View>
  );
}
