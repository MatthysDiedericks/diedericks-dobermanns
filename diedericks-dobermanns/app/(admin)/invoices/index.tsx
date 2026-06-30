import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useAdminInvoices } from '@/hooks/useAdmin';
import { formatPrice, titleCase } from '@/lib/format';
import type { InvoiceStatus } from '@/types/app.types';

export const INVOICE_TONE: Record<InvoiceStatus, BadgeTone> = {
  unpaid: 'gold',
  partial: 'gold',
  paid: 'success',
  overdue: 'danger',
  cancelled: 'muted',
};

export default function AdminInvoicesScreen() {
  const router = useRouter();
  const { data: invoices, loading } = useAdminInvoices();

  const outstanding = invoices
    .filter((i) => i.status !== 'paid' && i.status !== 'cancelled')
    .reduce((s, i) => s + (i.total - i.amount_paid), 0);

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Sales" title="Invoices" back={false} />

      <View className="mb-4 px-6">
        <Card>
          <Typography variant="caption">Outstanding balance</Typography>
          <Typography variant="displayLg" className="mt-1 text-gold">
            {formatPrice(outstanding)}
          </Typography>
        </Card>
      </View>

      {loading ? <CardListSkeleton count={4} /> : null}

      <View className="gap-3 px-6">
        {!loading && invoices.length === 0 ? (
          <EmptyState
            title="No invoices yet"
            message="Generate an invoice from an accepted quote."
          />
        ) : loading ? null : (
          invoices.map((invoice) => (
            <Pressable
              key={invoice.id}
              onPress={() => router.push({ pathname: '/(admin)/invoices/[id]', params: { id: invoice.id } })}
            >
              <Card className="flex-row items-center">
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Typography variant="subtitle" numberOfLines={1} className="flex-1">
                      {invoice.client?.full_name ?? 'Unassigned'}
                    </Typography>
                    <Badge label={titleCase(invoice.status)} tone={INVOICE_TONE[invoice.status]} />
                  </View>
                  <Typography variant="caption" className="mt-0.5">
                    {invoice.invoice_number ?? 'Draft'} · issued{' '}
                    {new Date(invoice.issued_at).toLocaleDateString()}
                  </Typography>
                  <Typography variant="label" className="mt-2">
                    {formatPrice(invoice.total)}
                    {invoice.status === 'partial'
                      ? `  ·  ${formatPrice(invoice.total - invoice.amount_paid)} due`
                      : ''}
                  </Typography>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.silver} />
              </Card>
            </Pressable>
          ))
        )}
      </View>
    </ScreenContainer>
  );
}
