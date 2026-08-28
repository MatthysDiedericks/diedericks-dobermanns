import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { PreviewBanner, PREVIEW_TITLE } from '@/components/portal/PreviewBanner';
import { StatementSummary } from '@/components/portal/StatementSummary';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useClients } from '@/hooks/useAdmin';
import { useClientPortalDocuments } from '@/hooks/useDocuments';
import { usePortalDogs } from '@/hooks/usePortal';
import { fetchClientPayments } from '@/lib/finance/clientPayments';
import { formatAmount, formatDate } from '@/lib/finance/formatters';
import { buildStatementRows } from '@/lib/finance/statementRows';
import { fetchClientInvoices } from '@/lib/finance/queries';
import { requireSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import type { InvoiceListRow } from '@/types/finance';

type Tab = 'statement' | 'documents' | 'dogs';

export default function ViewAsClientScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const adminName =
    useAuthStore((s) => s.profile?.full_name)?.split(' ')[0] || 'Matt';
  const { data: clients, loading: clientsLoading } = useClients();
  const client = clients.find((c) => c.id === id);
  const clientName = client?.full_name?.trim() || client?.email || 'Client';
  const [tab, setTab] = useState<Tab>('statement');
  const { dogs, loading: dogsLoading } = usePortalDogs(id);
  const { documents, loading: docsLoading } = useClientPortalDocuments(id);
  const [invoices, setInvoices] = useState<InvoiceListRow[]>([]);
  const [payments, setPayments] = useState<
    Array<{ payment_date: string; amount: number; reference: string | null; invoice_number: string }>
  >([]);
  const [stmtLoading, setStmtLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    void requireSupabase().rpc('log_portal_preview' as never, { p_client_id: id } as never);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setStmtLoading(true);
    Promise.all([fetchClientInvoices(id), fetchClientPayments(id)])
      .then(([inv, pay]) => {
        setInvoices(inv);
        setPayments(pay);
      })
      .catch((e) => console.warn('[view-as]', e))
      .finally(() => setStmtLoading(false));
  }, [id]);

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

  if (clientsLoading) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center">
        <ActivityIndicator color={Colors.gold} />
      </ScreenContainer>
    );
  }

  if (!client || !id) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center px-6">
        <Typography variant="subtitle">Client not found.</Typography>
        <Button label="Back" variant="outline" onPress={() => router.back()} className="mt-4" />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll={false}>
      <PreviewBanner
        clientName={clientName}
        adminName={adminName}
        onExit={() => router.replace(`/(admin)/clients/${id}`)}
      />
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="px-6 pt-4">
          <Typography variant="caption" className="text-gold">
            Viewing as client
          </Typography>
          <Typography variant="subtitle" className="mt-1 text-text">
            {clientName}
          </Typography>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-4 px-6"
          contentContainerStyle={{ gap: 8 }}
        >
          {(['statement', 'documents', 'dogs'] as const).map((t) => (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              className={`rounded-full border px-4 py-2 ${tab === t ? 'border-gold bg-gold/15' : 'border-gold/30'}`}
            >
              <Typography variant="caption">{t}</Typography>
            </Pressable>
          ))}
        </ScrollView>

        <View className="mt-4 px-6">
          {tab === 'statement' ? (
            stmtLoading ? (
              <ActivityIndicator color={Colors.gold} />
            ) : (
              <>
                <StatementSummary
                  totalInvoiced={summary.totalInvoiced}
                  totalPaid={summary.totalPaid}
                  outstanding={summary.outstanding}
                  ledger={summary.ledger}
                  onDownload={() => undefined}
                  downloadDisabled
                />
                {invoices.length === 0 ? (
                  <EmptyState title="No invoices" message="This client has no invoices." />
                ) : (
                  invoices.map((invoice) => (
                    <Card key={invoice.id} className="mb-3">
                      <Typography variant="label" className="font-mono text-gold">
                        {invoice.invoice_number}
                      </Typography>
                      <Typography variant="caption">
                        {formatDate(invoice.issue_date)} · {formatAmount(invoice.total_amount)}
                      </Typography>
                    </Card>
                  ))
                )}
              </>
            )
          ) : null}

          {tab === 'documents' ? (
            docsLoading ? (
              <ActivityIndicator color={Colors.gold} />
            ) : documents.length === 0 ? (
              <EmptyState title="No documents" message="Nothing visible in this client's portal." />
            ) : (
              documents.map((doc) => (
                <Card key={doc.id} className="mb-3">
                  <Typography variant="body">{doc.document_name}</Typography>
                  <Typography variant="caption">{doc.category}</Typography>
                </Card>
              ))
            )
          ) : null}

          {tab === 'dogs' ? (
            dogsLoading ? (
              <ActivityIndicator color={Colors.gold} />
            ) : dogs.length === 0 ? (
              <EmptyState title="No dogs" message="This client has no dogs in the portal." />
            ) : (
              dogs.map((dog) => (
                <Card key={dog.id} className="mb-3">
                  <Typography variant="body">{dog.name}</Typography>
                  <Typography variant="caption">{dog.status ?? '—'}</Typography>
                </Card>
              ))
            )
          ) : null}

          <Button
            label="Accept quote"
            disabled
            accessibilityHint={PREVIEW_TITLE}
            className="mt-4"
            onPress={() => undefined}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
