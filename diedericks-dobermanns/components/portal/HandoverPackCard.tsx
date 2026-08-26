import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { shareHandoverPack } from '@/lib/handover/sharePack';
import { requireSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

type Pack = { id: string; name: string };

export function PortalHandoverPacks() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const [packs, setPacks] = useState<Pack[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    void requireSupabase()
      .from('dogs')
      .select('id, name, handover_status')
      .eq('owner_id', userId)
      .eq('handover_status', 'delivered')
      .then(({ data }) => setPacks((data ?? []).map((d) => ({ id: d.id, name: d.name }))));
  }, [userId]);

  if (packs.length === 0) return null;

  return (
    <Card className="mb-4">
      <Typography variant="label" className="text-gold">
        HANDOVER PACK
      </Typography>
      <Typography variant="bodyMuted" className="mt-2">
        The folder from go-home — cover, parents&apos; papers, health record and contract.
      </Typography>
      {packs.map((p) => (
        <View key={p.id} className="mt-3">
          <Typography variant="body">{p.name}</Typography>
          <Button
            label={busyId === p.id ? 'Opening…' : 'Open and share'}
            variant="ghost"
            className="mt-2"
            disabled={busyId !== null}
            onPress={() => {
              setBusyId(p.id);
              shareHandoverPack(p.id)
                .catch((e) =>
                  Alert.alert('Handover pack', e instanceof Error ? e.message : 'Failed'),
                )
                .finally(() => setBusyId(null));
            }}
          />
        </View>
      ))}
    </Card>
  );
}
