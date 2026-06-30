import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { InvoiceStatusBadge } from '@/components/finance/InvoiceStatusBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { fetchClientInvoices } from '@/lib/finance/queries';
import { formatAmount, formatDate } from '@/lib/finance/formatters';
import { useAuthStore } from '@/stores/authStore';
import type { InvoiceListRow } from '@/types/finance';

export default function ClientInvoicesScreen() {
  const router = useRouter();
  const clientId = useAuthStore((s) => s.profile?.id);
  const [invoices, setInvoices] = useState<InvoiceListRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;
    fetchClientInvoices(clientId)
      .then(setInvoices)
      .finally(() => setLoading(false));
  }, [clientId]);

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Account" title="My invoices" />

      {loading ? <CardListSkeleton count={4} /> : null}

      <View className="gap-3 px-6">
        {!loading && invoices.length === 0 ? (
          <EmptyState title="No invoices" message="You don't have any invoices yet." />
        ) : null}
        {invoices.map((invoice) => (
          <Pressable
            key={invoice.id}
            onPress={() =>
              router.push({ pathname: '/(portal)/invoices/[id]', params: { id: invoice.id } })
            }
          >
            <Card className="flex-row items-center justify-between">
              <View className="flex-1">
                <Typography variant="label" className="font-mono text-gold">
                  {invoice.invoice_number}
                </Typography>
                <Typography variant="caption">
                  {formatDate(invoice.issue_date)} · {invoice.dog?.name ?? '—'}
                </Typography>
              </View>
              <View className="items-end gap-1">
                <Typography variant="label">{formatAmount(invoice.total_amount)}</Typography>
                <InvoiceStatusBadge status={invoice.status} />
              </View>
            </Card>
          </Pressable>
        ))}
      </View>
    </ScreenContainer>
  );
}
