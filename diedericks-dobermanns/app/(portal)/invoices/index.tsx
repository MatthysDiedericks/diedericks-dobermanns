import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { InvoiceStatusBadge } from '@/components/finance/InvoiceStatusBadge';
import { StatementSummary } from '@/components/portal/StatementSummary';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { exportClientStatement } from '@/lib/finance/generatePDF';
import { buildStatementRows } from '@/lib/finance/invoiceHtml';
import { formatAmount, formatDate } from '@/lib/finance/formatters';
import { fetchClientPayments } from '@/lib/finance/clientPayments';
import { fetchClientInvoices } from '@/lib/finance/queries';
import { fetchMyFinancialClientIds } from '@/lib/portal/memberScope';
import { useAuthStore } from '@/stores/authStore';
import type { InvoiceListRow } from '@/types/finance';

export default function ClientInvoicesScreen() {
  const router = useRouter();
  const clientId = useAuthStore((s) => s.profile?.id);
  const [invoices, setInvoices] = useState<InvoiceListRow[]>([]);
  const [payments, setPayments] = useState<
    Array<{
      payment_date: string;
      amount: number;
      reference: string | null;
      invoice_number: string;
    }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    setLoading(true);
    Promise.all([fetchMyFinancialClientIds()])
      .then(async ([ids]) => {
        const [invChunks, payChunks] = await Promise.all([
          Promise.all(ids.map((id) => fetchClientInvoices(id))),
          Promise.all(ids.map((id) => fetchClientPayments(id))),
        ]);
        setInvoices(invChunks.flat());
        setPayments(payChunks.flat());
      })
      .catch((e) => console.warn('[portal/invoices]', e))
      .finally(() => setLoading(false));
  }, [clientId]);

  const summary = useMemo(() => {
    const active = invoices.filter((i) => i.status !== 'cancelled');
    const totalInvoiced = active.reduce((s, i) => s + Number(i.total_amount ?? 0), 0);
    const totalPaid = active.reduce((s, i) => s + Number(i.amount_paid ?? 0), 0);
    const outstanding = active.reduce((s, i) => s + Number(i.amount_outstanding ?? 0), 0);
    const ledger = buildStatementRows(
      active.map((i) => ({
        issue_date: i.issue_date,
        invoice_number: i.invoice_number,
        total_amount: Number(i.total_amount),
        notes: i.notes,
      })),
      payments,
    );
    return { totalInvoiced, totalPaid, outstanding, ledger };
  }, [invoices, payments]);

  const onDownload = async () => {
    if (!clientId) return;
    setDownloading(true);
    try {
      await exportClientStatement(clientId);
    } catch (e) {
      console.warn('[portal/invoices] statement download', e);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Account" title="My invoices" />

      {loading ? <CardListSkeleton count={4} /> : null}

      <View className="gap-3 px-6">
        {!loading ? (
          <StatementSummary
            totalInvoiced={summary.totalInvoiced}
            totalPaid={summary.totalPaid}
            outstanding={summary.outstanding}
            ledger={summary.ledger}
            onDownload={() => void onDownload()}
            downloading={downloading}
          />
        ) : null}

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
