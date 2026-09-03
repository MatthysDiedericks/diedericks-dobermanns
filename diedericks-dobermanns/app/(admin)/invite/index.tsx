import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { InviteStateChip } from '@/components/admin/InviteStateChip';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useClients } from '@/hooks/useAdmin';
import { fetchInviteStates, formatInviteState, type InviteStateRow } from '@/lib/portal/invite';

export default function AdminInviteScreen() {
  const router = useRouter();
  const { data: clients, loading } = useClients();
  const [inviteMap, setInviteMap] = useState<Map<string, InviteStateRow>>(new Map());
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const emails = clients.map((c) => c.email ?? '').filter(Boolean);
    void fetchInviteStates(emails).then((map) => {
      setInviteMap(map);
      setFailed(map.failed);
    });
  }, [clients]);

  return (
    <ScreenContainer>
      <PageHeader eyebrow="People" title="Invite status" />
      {failed ? (
        <View className="mx-6 mb-3 rounded border border-gold/40 bg-surface px-4 py-3">
          <Typography variant="caption" className="text-gold">
            Invite status could not be loaded. The list below is incomplete.
          </Typography>
        </View>
      ) : null}
      <View className="gap-3 px-6 pb-8">
        {!loading && clients.length === 0 ? (
          <EmptyState title="No clients yet" />
        ) : (
          clients.map((client) => {
            const email = (client.email ?? '').toLowerCase();
            const state = email ? inviteMap.get(email) ?? null : null;
            return (
              <Pressable
                key={client.id}
                onPress={() => router.push(`/(admin)/clients/${client.id}`)}
              >
                <Card>
                  <Typography variant="subtitle">{client.full_name ?? 'Unnamed'}</Typography>
                  <Typography variant="caption" className="mt-0.5 text-subtle">
                    {client.email}
                  </Typography>
                  <View className="mt-2">
                    <InviteStateChip state={state} />
                    <Typography variant="caption" className="mt-1 text-subtle">
                      {formatInviteState(state)}
                    </Typography>
                  </View>
                </Card>
              </Pressable>
            );
          })
        )}
      </View>
    </ScreenContainer>
  );
}
