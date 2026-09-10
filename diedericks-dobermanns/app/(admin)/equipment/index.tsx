import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import { CatalogueManager } from '@/components/equipment/CatalogueManager';
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

const STATUS_FILTERS: { key: EquipmentEnquiryStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'new', label: 'New' },
  { key: 'quoted', label: 'Quoted' },
  { key: 'closed', label: 'Closed' },
];

export default function EquipmentAdminScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<EquipmentEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<EquipmentEnquiryStatus | 'all'>('all');

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

  const visible = useMemo(
    () => (status === 'all' ? rows : rows.filter((r) => r.status === status)),
    [rows, status],
  );

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Retail" title="Equipment shop" />
      <View className="gap-6 px-6 pb-10">
        <Typography variant="bodyMuted">
          Shop enquiries convert into the existing quote builder. They never touch the dog
          pipeline.
        </Typography>

        <View className="gap-3">
          <Typography variant="subtitle" className="text-gold">
            Catalogue
          </Typography>
          <CatalogueManager />
        </View>

        <View className="gap-3">
          <Typography variant="subtitle" className="text-gold">
            Enquiries
          </Typography>
          <View className="flex-row flex-wrap gap-2">
            {STATUS_FILTERS.map((f) => (
              <Pressable
                key={f.key}
                onPress={() => setStatus(f.key)}
                className={`rounded-lg border px-3 py-2 ${
                  status === f.key ? 'border-gold bg-gold/15' : 'border-gold/20'
                }`}
              >
                <Typography variant="caption">{f.label}</Typography>
              </Pressable>
            ))}
          </View>
          {!loading && visible.length === 0 ? (
            <EmptyState title="No equipment enquiries yet" />
          ) : (
            visible.map((enq) => (
              <Pressable
                key={enq.id}
                onPress={() => router.push(`/(admin)/equipment/${enq.id}` as never)}
              >
                <Card>
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 pr-3">
                      <Typography variant="subtitle">{enq.full_name}</Typography>
                      <Typography variant="caption" className="mt-0.5">
                        {enq.email} · {enq.phone}
                      </Typography>
                      <Typography variant="caption" className="mt-1 capitalize">
                        {enq.fulfilment}
                        {enq.items.length
                          ? ` · ${enq.items.map((it) => `${it.label} × ${it.quantity}`).join(', ')}`
                          : ''}
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
      </View>
    </ScreenContainer>
  );
}
