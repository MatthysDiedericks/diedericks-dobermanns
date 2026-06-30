import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { InvoiceStatusBadge } from '@/components/finance/InvoiceStatusBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { fetchInvoiceById } from '@/lib/finance/queries';
import { exportInvoicePDF } from '@/lib/finance/generatePDF';
import { formatAmount, formatDate, humanizeItemType } from '@/lib/finance/formatters';
import type { InvoiceWithDetails } from '@/types/finance';

export default function ClientInvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [invoice, setInvoice] = useState<InvoiceWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchInvoiceById(id)
      .then(setInvoice)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading || !invoice) {
    return (
      <ScreenContainer>
        <PageHeader eyebrow="Invoice" title="Detail" />
        <CardListSkeleton count={2} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View className="flex-row items-start justify-between px-6">
        <PageHeader eyebrow="Invoice" title={invoice.invoice_number} />
        <Pressable
          onPress={() => exportInvoicePDF(invoice)}
          className="mt-8 h-10 w-10 items-center justify-center rounded-full border border-gold/30"
        >
          <Ionicons name="download-outline" size={20} color={Colors.gold} />
        </Pressable>
      </View>

      <ScrollView className="px-6 pb-12">
        <Card>
          <InvoiceStatusBadge status={invoice.status} />
          <Typography variant="caption" className="mt-2">
            Issue {formatDate(invoice.issue_date)} · Due {formatDate(invoice.due_date)}
          </Typography>

          <View className="mt-6 border-t border-gold/20 pt-4">
            {invoice.items.map((item) => (
              <View key={item.id} className="mb-3 flex-row justify-between">
                <View className="flex-1 pr-4">
                  <Typography variant="body">{item.description}</Typography>
                  <Typography variant="caption">
                    {humanizeItemType(item.item_type)} · {item.quantity} × {formatAmount(item.unit_price)}
                  </Typography>
                </View>
                <Typography variant="label">{formatAmount(item.line_total)}</Typography>
              </View>
            ))}
          </View>

          <View className="mt-4 border-t border-gold/20 pt-4">
            <View className="flex-row justify-between">
              <Typography variant="subtitle">Total</Typography>
              <Typography variant="display" className="text-gold">
                {formatAmount(invoice.total_amount)}
              </Typography>
            </View>
            <View className="flex-row justify-between mt-2">
              <Typography variant="body">Paid</Typography>
              <Typography variant="label" className="text-success">
                {formatAmount(invoice.amount_paid)}
              </Typography>
            </View>
            {invoice.amount_outstanding > 0 ? (
              <View className="flex-row justify-between mt-1">
                <Typography variant="body" className="text-danger">Outstanding</Typography>
                <Typography variant="label" className="text-danger">
                  {formatAmount(invoice.amount_outstanding)}
                </Typography>
              </View>
            ) : null}
          </View>

          {invoice.notes ? (
            <Typography variant="caption" className="mt-4 text-subtle">{invoice.notes}</Typography>
          ) : null}
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}
