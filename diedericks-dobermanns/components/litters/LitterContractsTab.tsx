import { useRef } from 'react';
import { Alert, View } from 'react-native';

import {
  CreateLitterContractSheet,
  type CreateLitterContractSheetHandle,
} from '@/components/litters/CreateLitterContractSheet';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Typography } from '@/components/ui/Typography';
import { useLitterContracts, type LitterContractRow } from '@/hooks/useLitterContracts';
import { titleCase } from '@/lib/format';
import type { Dog } from '@/types/app.types';

function contractStatus(contract: LitterContractRow): { label: string; tone: BadgeTone } {
  if (contract.signed_by_client || contract.status === 'signed') {
    return { label: 'Signed', tone: 'success' };
  }
  if (contract.status === 'sent') return { label: 'Sent', tone: 'gold' };
  if (contract.status === 'expired') return { label: 'Expired', tone: 'danger' };
  return { label: 'Draft', tone: 'muted' };
}

function canSendEsign(contract: LitterContractRow): boolean {
  return !contract.signed_by_client && contract.status !== 'signed';
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
  const { contracts, loading, createContract, sendEsign } = useLitterContracts(litterId, puppyIds);

  async function handleSend(id: string) {
    try {
      await sendEsign(id);
      Alert.alert('Sent', 'E-sign link has been prepared for this contract.');
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Could not send e-sign');
    }
  }

  return (
    <View className="pb-8">
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
                    {c.signed_at ? (
                      <Typography variant="caption" className="mt-1 text-success">
                        Signed {new Date(c.signed_at).toLocaleDateString()}
                      </Typography>
                    ) : null}
                  </View>
                  <Badge label={status.label} tone={status.tone} />
                </View>
                {canSendEsign(c) ? (
                  <Button
                    label="Send eSign"
                    variant="secondary"
                    size="sm"
                    onPress={() => void handleSend(c.id)}
                    className="mt-3 self-start"
                  />
                ) : null}
              </Card>
            );
          })}
        </View>
      )}

      <CreateLitterContractSheet
        ref={sheetRef}
        puppies={puppies}
        onCreate={createContract}
      />
    </View>
  );
}
