import { useLocalSearchParams, useRouter } from 'expo-router';
import { View } from 'react-native';

import { LineItems } from '@/components/sales/LineItems';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useAdminQuotes } from '@/hooks/useAdmin';
import {
  createInvoiceFromQuote,
  updateQuoteStatus,
  useSubmitting,
} from '@/hooks/useMutations';
import { formatPrice, titleCase } from '@/lib/format';
import { QUOTE_TONE } from '@/app/(admin)/quotes/index';

export default function QuoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: quotes, loading, refetch } = useAdminQuotes();
  const { submitting, run } = useSubmitting();
  const quote = quotes.find((q) => q.id === id);

  if (!loading && !quote) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center px-6">
        <Typography variant="subtitle">Quote not found.</Typography>
        <Button label="Back" variant="outline" onPress={() => router.back()} className="mt-4" />
      </ScreenContainer>
    );
  }

  async function setStatus(status: Parameters<typeof updateQuoteStatus>[1]) {
    if (!id) return;
    await run(() => updateQuoteStatus(id, status));
    await refetch();
  }

  async function generateInvoice() {
    if (!quote) return;
    const { error, id: invoiceId } = await run(() => createInvoiceFromQuote(quote));
    if (!error) {
      if (invoiceId) router.replace({ pathname: '/(admin)/invoices/[id]', params: { id: invoiceId } });
      else router.replace('/(admin)/invoices/index');
    }
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Quote" title={quote?.quote_number ?? 'Draft Quote'} />

      {quote ? (
        <View className="gap-4 px-6">
          <Card>
            <View className="flex-row items-center justify-between">
              <Typography variant="subtitle">{quote.client?.full_name ?? 'Unassigned'}</Typography>
              <Badge label={titleCase(quote.status)} tone={QUOTE_TONE[quote.status]} />
            </View>
            {quote.valid_until ? (
              <Typography variant="caption" className="mt-1">
                Valid until {new Date(quote.valid_until).toLocaleDateString()}
              </Typography>
            ) : null}
          </Card>

          <LineItems
            items={quote.items ?? []}
            subtotal={quote.subtotal}
            discount={quote.discount}
            total={quote.total}
          />

          {quote.notes ? (
            <Card>
              <Typography variant="label" className="mb-1">
                Notes
              </Typography>
              <Typography variant="bodyMuted">{quote.notes}</Typography>
            </Card>
          ) : null}

          <View className="gap-2">
            <Typography variant="label">Update status</Typography>
            <View className="flex-row flex-wrap gap-2">
              <Button label="Mark Sent" variant="outline" onPress={() => setStatus('sent')} loading={submitting} />
              <Button label="Accepted" variant="outline" onPress={() => setStatus('accepted')} loading={submitting} />
              <Button label="Declined" variant="danger" onPress={() => setStatus('declined')} loading={submitting} />
            </View>
          </View>

          <Button
            label={`Generate Invoice · ${formatPrice(quote.total)}`}
            onPress={generateInvoice}
            loading={submitting}
            fullWidth
            className="mt-2"
          />
          <Button
            label="Edit Quote"
            variant="outline"
            onPress={() => router.push({ pathname: '/(admin)/quotes/new', params: { id: quote.id } })}
            fullWidth
          />
        </View>
      ) : null}
    </ScreenContainer>
  );
}
