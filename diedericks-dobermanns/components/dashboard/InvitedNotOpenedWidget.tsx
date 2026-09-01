import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { SurfaceCard } from '@/components/admin/SurfaceCard';
import { Typography } from '@/components/ui/Typography';
import {
  countConfirmedNeverSignedIn,
  countUnopenedInvites,
  fetchClientsWhoCannotGetIn,
  type CannotGetInClient,
} from '@/lib/portal/invite';

export function InvitedNotOpenedWidget() {
  const router = useRouter();
  const [clients, setClients] = useState<CannotGetInClient[]>([]);
  const [counts, setCounts] = useState({ unopened: 0, locked: 0 });

  const load = useCallback(async () => {
    try {
      const [list, unopened, locked] = await Promise.all([
        fetchClientsWhoCannotGetIn(),
        countUnopenedInvites(),
        countConfirmedNeverSignedIn(),
      ]);
      setClients(list);
      setCounts({ unopened, locked });
    } catch {
      setClients([]);
      setCounts({ unopened: 0, locked: 0 });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const badge = clients.length || counts.locked || counts.unopened;

  return (
    <SurfaceCard title="Clients who cannot get in" badge={badge} badgeTone="gold">
      {clients.length === 0 ? (
        <Typography variant="caption" className="text-subtle">
          Nobody is stuck. Every client with an account has signed in.
        </Typography>
      ) : (
        clients.map((row) => (
          <Pressable
            key={row.id}
            onPress={() => router.push(`/(admin)/clients/${row.id}` as never)}
            className="border-b border-gold/10 py-3"
          >
            <Typography variant="body">{row.fullName}</Typography>
            <Typography variant="caption">{row.email}</Typography>
            <View className="mt-1">
              <Typography variant="caption" className="text-subtle">
                {row.daysWaiting} day{row.daysWaiting === 1 ? '' : 's'} waiting · {row.stateLabel}
              </Typography>
            </View>
          </Pressable>
        ))
      )}
    </SurfaceCard>
  );
}
