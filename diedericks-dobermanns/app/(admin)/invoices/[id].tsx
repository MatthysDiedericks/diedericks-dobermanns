import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { LineItems } from '@/components/sales/LineItems';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useAdminInvoices } from '@/hooks/useAdmin';
import { recordInvoicePayment, updateInvoiceStatus, useSubmitting } from '@/hooks/useMutations';
import { formatPrice, titleCase } from '@/lib/format';
import { INVOICE_TONE } from '@/app/(admin)/invoices/index';

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: invoices, loading, refetch } = useAdminInvoices();
  const { submitting, run } = useSubmitting();
  const invoice = invoices.find((i) => i.id === id);
  const [payment, setPayment] = useState('');

  if (!loading && !invoice) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center px-6">
        <Typography variant="subtitle">Invoice not found.</Typography>
        <Button label="Back" variant="outline" onPress={() => router.back()} className="mt-4" />
      </ScreenContainer>
    );
  }

  async function markPaidInFull() {
    if (!invoice) return;
    await run(() => recordInvoicePayment(invoice.id, invoice.total, invoice.total));
    await refetch();
  }

  async function recordPartial() {
    if (!invoice) return;
    const amount = Number(payment) || 0;
    if (amount <= 0) return;
    await run(() => recordInvoicePayment(invoice.id, amount, invoice.total));
    setPayment('');
    await refetch();
  }

  async function cancel() {
    if (!invoice) return;
    await run(() => updateInvoiceStatus(invoice.id, 'cancelled'));
    await refetch();
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Invoice" title={invoice?.invoice_number ?? 'Invoice'} />

      {invoice ? (
        <View className="gap-4 px-6">
          <Card>
            <View className="flex-row items-center justify-between">
              <Typography variant="subtitle">{invoice.client?.full_name ?? 'Unassigned'}</Typography>
              <Badge label={titleCase(invoice.status)} tone={INVOICE_TONE[invoice.status]} />
            </View>
            <Typography variant="caption" className="mt-1">
              Issued {new Date(invoice.issued_at).toLocaleDateString()}
              {invoice.due_date ? ` · due ${new Date(invoice.due_date).toLocaleDateString()}` : ''}
            </Typography>
            {invoice.amount_paid > 0 ? (
              <Typography variant="caption" className="mt-1 text-success">
                Paid {formatPrice(invoice.amount_paid)} of {formatPrice(invoice.total)}
              </Typography>
            ) : null}
          </Card>

          <LineItems
            items={invoice.items ?? []}
            subtotal={invoice.subtotal}
            discount={invoice.discount}
            total={invoice.total}
          />

          {invoice.notes ? (
            <Card>
              <Typography variant="label" className="mb-1">
                Notes
              </Typography>
              <Typography variant="bodyMuted">{invoice.notes}</Typography>
            </Card>
          ) : null}

          {invoice.status !== 'paid' && invoice.status !== 'cancelled' ? (
            <>
              <Button
                label={`Mark Paid in Full · ${formatPrice(invoice.total)}`}
                onPress={markPaidInFull}
                loading={submitting}
                fullWidth
              />
              <View className="flex-row items-end gap-3">
                <Input
                  containerClassName="mb-0 flex-1"
                  label="Record a payment (ZAR)"
                  keyboardType="phone-pad"
                  value={payment}
                  onChangeText={setPayment}
                />
                <Button label="Record" variant="outline" onPress={recordPartial} loading={submitting} />
              </View>
              <Button label="Cancel Invoice" variant="danger" onPress={cancel} loading={submitting} fullWidth />
            </>
          ) : null}
        </View>
      ) : null}
    </ScreenContainer>
  );
}
