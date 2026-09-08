import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { fetchEquipmentEnquiries } from '@/lib/equipment/queries';
import type { EquipmentEnquiry, EquipmentEnquiryStatus } from '@/lib/equipment/types';
import { formatDate } from '@/lib/finance/formatters';

const TONE: Record<EquipmentEnquiryStatus, BadgeTone> = {
  new: 'gold',
  quoted: 'success',
  closed: 'muted',
};

export default function EquipmentEnquiriesScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<EquipmentEnquiry[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await fetchEquipmentEnquiries());
    } catch (e) {
      Alert.alert('Could not load enquiries', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Retail" title="Equipment enquiries" />
      <View className="gap-3 px-6 pb-10">
        {!loading && rows.length === 0 ? (
          <EmptyState title="No equipment enquiries yet" />
        ) : (
          rows.map((enq) => (
            <Pressable key={enq.id} onPress={() => router.push(`/(admin)/equipment/${enq.id}` as never)}>
              <Card>
                <View className="flex-row items-start justify-between">
                  <View className="flex-1 pr-3">
                    <Typography variant="subtitle">{enq.full_name}</Typography>
                    <Typography variant="caption" className="mt-0.5">
                      {enq.email} · {enq.phone}
                    </Typography>
                    <Typography variant="caption" className="mt-1 capitalize">
                      {enq.fulfilment}
                      {enq.items.length ? ` · ${enq.items.map((it) => `${it.label} × ${it.quantity}`).join(', ')}` : ''}
                    </Typography>
                    <Typography variant="caption" className="mt-1">
                      {formatDate(enq.created_at)}
                    </Typography>
                  </View>
                  <Badge label={enq.status} tone={TONE[enq.status]} />
                </View>
              </Card>
            </Pressable>
          ))
        )}
      </View>
    </ScreenContainer>
  );
}
