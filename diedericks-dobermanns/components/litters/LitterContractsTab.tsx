import { useRef, useState } from 'react';
import { Alert, Linking, Share, View } from 'react-native';

import {
  CreateLitterContractSheet,
  type CreateLitterContractSheetHandle,
} from '@/components/litters/CreateLitterContractSheet';
import { LitterReleaseSection } from '@/components/litters/LitterReleaseSection';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Typography } from '@/components/ui/Typography';
import { useLitterContracts } from '@/hooks/useLitterContracts';
import { contractStatusChip, signingUrl } from '@/lib/contracts/signingLink';
import { titleCase } from '@/lib/format';
import type { Dog } from '@/types/app.types';

export function LitterContractsTab({
  litterId,
  puppies,
}: {
  litterId: string;
  puppies: Dog[];
}) {
  const sheetRef = useRef<CreateLitterContractSheetHandle>(null);
  const puppyIds = puppies.map((p) => p.id);
  const { contracts, loading, createContract, bulkCreate, sendEsign, refresh } = useLitterContracts(
    litterId,
    puppyIds,
  );
  const [busy, setBusy] = useState(false);

  const byDog = new Map<string, (typeof contracts)[number]>();
  for (const c of contracts) {
    if (c.parent_contract_id) continue;
    if (c.dog_id && !byDog.has(c.dog_id)) byDog.set(c.dog_id, c);
  }

  async function handleSend(id: string) {
    try {
      const res = await sendEsign(id);
      const link = res.link;
      if (link) {
        Alert.alert('Link ready', link, [
          { text: 'Share', onPress: () => void Share.share({ message: link }) },
          {
            text: 'WhatsApp',
            onPress: () => void Linking.openURL(`https://wa.me/?text=${encodeURIComponent(link)}`),
          },
          { text: 'OK' },
        ]);
      }
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not send');
    }
  }

  async function handleBulk() {
    setBusy(true);
    try {
      const res = await bulkCreate();
      Alert.alert('Drafts', `Created ${res.created}, already had ${res.skipped}.`);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Bulk create failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="pb-8">
      <LitterReleaseSection puppies={puppies} onReleased={refresh} />
      <Typography variant="caption" className="mb-3 text-silver">
        Editing the body is website-only. From here you can create, read and send.
      </Typography>
      <Button
        label={`Create drafts for ${puppies.length} puppies`}
        onPress={() => void handleBulk()}
        fullWidth
        className="mb-3"
        disabled={puppies.length === 0 || busy}
      />
      <Button
        label="+ One puppy"
        onPress={() => sheetRef.current?.open()}
        fullWidth
        variant="secondary"
        className="mb-4"
        disabled={puppies.length === 0}
      />

      {loading ? (
        <Typography variant="bodyMuted">Loading contracts…</Typography>
      ) : puppies.length === 0 ? (
        <EmptyState title="No puppies" message="Register pups first." />
      ) : (
        <View className="gap-3">
          {puppies.map((p) => {
            const c = byDog.get(p.id);
            const chip = contractStatusChip({
              status: c?.status ?? null,
              signedByClient: Boolean(c?.signed_by_client),
              clientSignedAt: c?.client_signed_at,
            });
            const buyer = c?.client?.full_name ?? c?.contact?.full_name ?? '—';
            return (
              <Card key={p.id}>
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-2">
                    <Typography variant="subtitle">{p.name}</Typography>
                    {p.colour ? (
                      <Typography variant="caption" className="text-silver">
                        {titleCase(String(p.colour).replace('_', ' '))}
                      </Typography>
                    ) : null}
                    <Typography variant="caption" className="mt-1">
                      {buyer}
                    </Typography>
                  </View>
                  <Badge label={chip.label} tone={chip.tone} />
                </View>
                <View className="mt-3 flex-row gap-3">
                  {c && !c.signed_by_client ? (
                    <Button label="Send" variant="secondary" size="sm" onPress={() => void handleSend(c.id)} />
                  ) : null}
                  {c?.esign_token ? (
                    <Button
                      label="Open link"
                      variant="ghost"
                      size="sm"
                      onPress={() => void Linking.openURL(signingUrl(c.esign_token!))}
                    />
                  ) : null}
                </View>
              </Card>
            );
          })}
        </View>
      )}

      <CreateLitterContractSheet ref={sheetRef} puppies={puppies} onCreate={createContract} />
    </View>
  );
}
