import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { useContractRelease, useContractTemplates, usePuppyClients } from '@/hooks/useContractRelease';
import { formatKennelDate } from '@/lib/kennel/formatters';
import type { Dog } from '@/types/app.types';

/**
 * Per-puppy "Release & Send Contract" trigger — the manual admin action that
 * generates the real contract PDF and emails the e-sign link. Only enabled
 * once a client is actually linked to the puppy (owner_id or a reservation).
 */
export function LitterReleaseSection({
  puppies,
  onReleased,
}: {
  puppies: Dog[];
  onReleased: () => void;
}) {
  const puppyIds = puppies.map((p) => p.id);
  const { clients, loading: clientsLoading } = usePuppyClients(puppyIds);
  const { templates } = useContractTemplates();
  const { releaseAndSendContract, releasing } = useContractRelease();
  const [templateByPuppy, setTemplateByPuppy] = useState<Record<string, string>>({});

  if (puppies.length === 0) return null;

  async function handleRelease(puppy: Dog) {
    const client = clients.get(puppy.id);
    const templateId = templateByPuppy[puppy.id] ?? templates[0]?.id;
    if (!client || !templateId) return;
    try {
      await releaseAndSendContract({ dogId: puppy.id, clientId: client.clientId, templateId });
      Alert.alert('Released', `${puppy.name}'s contract has been generated and emailed to ${client.fullName ?? 'the client'}.`);
      onReleased();
    } catch (e) {
      Alert.alert('Could not release', e instanceof Error ? e.message : 'Please try again.');
    }
  }

  return (
    <View className="mb-6 gap-3">
      <Typography variant="label" className="text-gold">
        PUPPIES — RELEASE &amp; SEND CONTRACT
      </Typography>
      {puppies.map((puppy) => {
        const ext = puppy as Dog & { released_at?: string | null };
        const client = clients.get(puppy.id);
        const canRelease = Boolean(client) && !ext.released_at;
        const selectedTemplate = templateByPuppy[puppy.id] ?? templates[0]?.id;

        return (
          <Card key={puppy.id}>
            <View className="flex-row items-start justify-between">
              <View className="flex-1 pr-2">
                <Typography variant="subtitle">{puppy.name}</Typography>
                <Typography variant="caption" className="text-silver">
                  {client ? `Client: ${client.fullName ?? 'Linked client'}` : 'No client linked yet'}
                </Typography>
              </View>
              {ext.released_at ? (
                <Badge label={`Released ${formatKennelDate(ext.released_at)}`} tone="success" />
              ) : null}
            </View>

            {!ext.released_at && templates.length > 1 ? (
              <View className="mt-3 flex-row gap-2">
                {templates.map((t) => {
                  const active = selectedTemplate === t.id;
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => setTemplateByPuppy((m) => ({ ...m, [puppy.id]: t.id }))}
                      className={`rounded-full border px-3 py-1 ${active ? 'border-gold bg-gold/15' : 'border-gold/20'}`}
                    >
                      <Typography variant="caption">{t.name}</Typography>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {!ext.released_at ? (
              <>
                <Button
                  label="Release & Send Contract"
                  size="sm"
                  onPress={() => void handleRelease(puppy)}
                  loading={releasing === puppy.id}
                  disabled={!canRelease || clientsLoading}
                  className="mt-3 self-start"
                />
                {!client && !clientsLoading ? (
                  <Typography variant="caption" className="mt-1 text-silver">
                    Link a client (reservation or owner) before releasing this puppy.
                  </Typography>
                ) : null}
              </>
            ) : null}
          </Card>
        );
      })}
    </View>
  );
}
