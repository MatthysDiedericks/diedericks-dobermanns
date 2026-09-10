import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { convertEquipmentEnquiryToQuote } from '@/lib/equipment/convertToQuote';
import { shopPriceLabel } from '@/lib/equipment/display';
import { fetchEquipmentEnquiry, updateEquipmentEnquiryStatus } from '@/lib/equipment/queries';
import type { EquipmentEnquiry, EquipmentEnquiryStatus } from '@/lib/equipment/types';
import { formatDate } from '@/lib/finance/formatters';

const TONE: Record<EquipmentEnquiryStatus, BadgeTone> = {
  new: 'gold',
  quoted: 'success',
  closed: 'muted',
};

export default function EquipmentEnquiryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [enquiry, setEnquiry] = useState<EquipmentEnquiry | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    if (!id) return;
    try {
      setEnquiry(await fetchEquipmentEnquiry(id));
    } catch (e) {
      Alert.alert('Could not load enquiry', e instanceof Error ? e.message : 'Unknown error');
    }
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function convert() {
    if (!id) return;
    setBusy(true);
    const res = await convertEquipmentEnquiryToQuote(id);
    setBusy(false);
    if (res.error && !res.quoteId) {
      Alert.alert('Could not convert', res.error);
      return;
    }
    if (res.quoteId) router.push(`/(admin)/quotes/${res.quoteId}/edit` as never);
  }

  async function close() {
    if (!id) return;
    setBusy(true);
    const res = await updateEquipmentEnquiryStatus(id, 'closed');
    setBusy(false);
    if (res.error) Alert.alert('Could not close', res.error);
    else await reload();
  }

  if (!enquiry) {
    return (
      <ScreenContainer>
        <PageHeader eyebrow="Retail" title="Enquiry" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Retail" title={enquiry.full_name} />
      <View className="gap-4 px-6 pb-10">
        <Card className="p-4">
          <View className="flex-row justify-between">
            <Typography variant="caption">{enquiry.email}</Typography>
            <Badge label={enquiry.status} tone={TONE[enquiry.status]} />
          </View>
          <Typography variant="caption" className="mt-1">
            {enquiry.phone}
          </Typography>
          <Typography variant="body" className="mt-3 capitalize">
            {enquiry.fulfilment}
          </Typography>
          {enquiry.delivery_address ? (
            <Typography variant="bodyMuted" className="mt-1">
              {enquiry.delivery_address}
            </Typography>
          ) : null}
          {enquiry.message ? (
            <Typography variant="bodyMuted" className="mt-2">
              {enquiry.message}
            </Typography>
          ) : null}
          <Typography variant="caption" className="mt-2">
            {formatDate(enquiry.created_at)}
          </Typography>
        </Card>

        <Card className="p-4">
          <Typography variant="subtitle" className="text-gold">
            Items
          </Typography>
          {enquiry.items.map((it) => (
            <View key={it.id} className="mt-2 flex-row justify-between">
              <Typography variant="body">
                {it.label} × {it.quantity}
              </Typography>
              <Typography variant="caption">
                {shopPriceLabel(it)}
              </Typography>
            </View>
          ))}
        </Card>

        {enquiry.quote_id ? (
          <Button
            label="Open quote"
            onPress={() => router.push(`/(admin)/quotes/${enquiry.quote_id}` as never)}
            fullWidth
          />
        ) : (
          <Button label="Convert to quote" onPress={() => void convert()} loading={busy} fullWidth />
        )}
        {enquiry.status !== 'closed' ? (
          <Button label="Close" variant="outline" onPress={() => void close()} disabled={busy} fullWidth />
        ) : null}
      </View>
    </ScreenContainer>
  );
}
