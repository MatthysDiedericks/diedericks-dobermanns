import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import { ApplicationChangeDiff } from '@/components/applications/ApplicationChangeDiff';
import { SurfaceCard } from '@/components/admin/SurfaceCard';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { reapproveApplicationChanges } from '@/lib/applications/amendments';
import { discussWhatsAppText } from '@/lib/applications/fieldTiers';
import { fetchPendingChanges, type PendingChangeItem } from '@/lib/applications/pendingChanges';
import { formatDateTime } from '@/lib/format';
import { openWhatsApp } from '@/lib/social';
import { requireSupabase, supabase } from '@/lib/supabase';

export function PendingApplicationChangesWidget() {
  const router = useRouter();
  const [items, setItems] = useState<PendingChangeItem[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) return;
    setItems(await fetchPendingChanges(requireSupabase()));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (items.length === 0) return null;

  return (
    <SurfaceCard
      title="Application changes"
      href="/(admin)/applications"
      badge={items.length}
      badgeTone="gold"
    >
      {items.map((item) => {
        const first = item.fullName.trim().split(/\s+/)[0] || item.fullName;
        return (
          <View key={item.id} className="border-t border-gold/10 py-3 first:border-t-0">
            <Typography variant="body" className="mb-2 text-gold">
              {item.fullName}
            </Typography>
            <ApplicationChangeDiff changes={item.changes} />
            <Typography variant="caption" className="mt-1">
              Changed {item.changedAt ? formatDateTime(item.changedAt) : ''} by {item.changedByName}
            </Typography>
            <View className="mt-3 gap-2">
              <Button
                label="Re-approve"
                size="sm"
                loading={busyId === item.id}
                onPress={async () => {
                  setBusyId(item.id);
                  const res = await reapproveApplicationChanges(item.id);
                  setBusyId(null);
                  if (!res.error) void load();
                }}
              />
              <Button
                label="Discuss"
                variant="outline"
                size="sm"
                onPress={() => openWhatsApp(item.phone, discussWhatsAppText(first))}
              />
              <Button
                label="Open"
                variant="ghost"
                size="sm"
                onPress={() =>
                  router.push({ pathname: '/(admin)/applications/[id]', params: { id: item.id } })
                }
              />
            </View>
          </View>
        );
      })}
    </SurfaceCard>
  );
}
