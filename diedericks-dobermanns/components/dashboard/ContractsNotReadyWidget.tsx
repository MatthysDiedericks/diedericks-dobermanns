import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';

import { SurfaceCard } from '@/components/admin/SurfaceCard';
import { Typography } from '@/components/ui/Typography';
import { fetchAllContractsNotReady } from '@/lib/contracts/notReadyList';

export function ContractsNotReadyWidget() {
  const router = useRouter();
  const [rows, setRows] = useState<{ id: string; label: string; count: number }[]>([]);

  const load = useCallback(async () => {
    try {
      setRows(await fetchAllContractsNotReady());
    } catch {
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <SurfaceCard title="Contracts not ready to send" href="/(admin)/contracts" badge={rows.length} badgeTone="gold">
      {rows.length === 0 ? (
        <Typography variant="caption" className="text-subtle">
          Every draft is complete.
        </Typography>
      ) : (
        rows.map((r) => (
          <Pressable
            key={r.id}
            onPress={() =>
              router.push({ pathname: '/(admin)/contracts/[id]', params: { id: r.id } } as never)
            }
            className="border-b border-gold/10 py-3"
          >
            <Typography variant="body">{r.label}</Typography>
            <Typography variant="caption">
              {r.count} field{r.count === 1 ? '' : 's'} missing
            </Typography>
          </Pressable>
        ))
      )}
    </SurfaceCard>
  );
}
