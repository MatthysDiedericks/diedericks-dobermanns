import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { InvoiceStatusBadge } from '@/components/finance/InvoiceStatusBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useInvoices } from '@/hooks/useInvoices';
import { formatAmount, formatDate } from '@/lib/finance/formatters';

const FILTERS = ['all', 'draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled'] as const;

export default function FinanceInvoicesListScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const { data: invoices, loading } = useInvoices(filter === 'all' ? undefined : filter);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return invoices;
    return invoices.filter(
      (i) =>
        i.invoice_number?.toLowerCase().includes(q) ||
        i.client?.full_name?.toLowerCase().includes(q),
    );
  }, [invoices, search]);

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Finance" title="Invoices" />

      <View className="mb-4 px-6">
        <Input
          value={search}
          onChangeText={setSearch}
          placeholder="Search invoice or client…"
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 px-6">
        {FILTERS.map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            className={`mr-2 rounded-full border px-3 py-1.5 ${
              f === filter ? 'border-gold bg-gold/15' : 'border-gold/30'
            }`}
          >
            <Typography variant="caption">
              {f === 'all' ? 'All' : f.replace(/_/g, ' ')}
            </Typography>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? <CardListSkeleton count={5} /> : null}

      <View className="gap-3 px-6 pb-24">
        {!loading && filtered.length === 0 ? (
          <EmptyState title="No invoices" message="Create a new invoice to get started." />
        ) : null}
        {filtered.map((invoice) => (
          <Pressable
            key={invoice.id}
            onPress={() =>
              router.push({ pathname: '/(admin)/finance/invoices/[id]', params: { id: invoice.id } })
            }
          >
            <Card>
              <View className="flex-row items-start justify-between">
                <View className="flex-1">
                  <Typography variant="label" className="font-mono text-gold">
                    {invoice.invoice_number}
                  </Typography>
                  <Typography variant="subtitle" className="mt-1">
                    {invoice.client?.full_name ?? 'Unassigned'}
                  </Typography>
                  {invoice.dog?.name ? (
                    <Typography variant="caption">{invoice.dog.name}</Typography>
                  ) : null}
                  <Typography variant="caption" className="mt-1">
                    {formatDate(invoice.issue_date)}
                  </Typography>
                </View>
                <View className="items-end gap-2">
                  <Typography variant="label">{formatAmount(invoice.total_amount)}</Typography>
                  {invoice.amount_outstanding > 0 ? (
                    <Typography variant="caption" className="text-danger">
                      {formatAmount(invoice.amount_outstanding)} due
                    </Typography>
                  ) : null}
                  <InvoiceStatusBadge status={invoice.status} />
                </View>
              </View>
            </Card>
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={() => router.push('/(admin)/finance/invoices/new')}
        className="absolute bottom-6 right-6 rounded-full border border-gold bg-gold px-6 py-3"
      >
        <Typography variant="label" className="text-black-rich">+ New invoice</Typography>
      </Pressable>
    </ScreenContainer>
  );
}
