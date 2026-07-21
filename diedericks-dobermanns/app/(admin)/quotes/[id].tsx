import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, View } from 'react-native';

import { LineItems } from '@/components/sales/LineItems';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useQuoteDetail } from '@/hooks/useQuotes';
import {
  buildQuoteMessage,
  convertQuoteToInvoice,
  logQuoteEmailNotification,
  quoteEmail,
  quotePhone,
  updateQuoteStatus,
} from '@/lib/finance/quoteQueries';
import { formatPrice, titleCase } from '@/lib/format';
import { QUOTE_TONE, quoteClientLabel } from '@/app/(admin)/quotes/index';
import type { QuoteStatus } from '@/types/app.types';

export default function QuoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { quote, loading, refresh } = useQuoteDetail(id ?? '');
  const [busy, setBusy] = useState(false);

  if (!loading && !quote) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center px-6">
        <Typography variant="subtitle">Quote not found.</Typography>
        <Button label="Back" variant="outline" onPress={() => router.back()} className="mt-4" />
      </ScreenContainer>
    );
  }

  async function setStatus(status: QuoteStatus) {
    if (!id) return;
    setBusy(true);
    try {
      await updateQuoteStatus(id, status);
      await refresh();
    } catch (e) {
      Alert.alert('Could not update status', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function generateInvoice() {
    if (!quote) return;
    setBusy(true);
    try {
      const invoiceId = await convertQuoteToInvoice(quote.id);
      await refresh();
      router.replace({ pathname: '/(admin)/finance/invoices/[id]', params: { id: invoiceId } });
    } catch (e) {
      Alert.alert('Could not convert to invoice', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  const canConvert = !quote?.converted_invoice_id && (quote?.status === 'sent' || quote?.status === 'accepted');
  const canSend = quote?.status === 'draft' || quote?.status === 'sent';
  const phone = quote ? quotePhone(quote) : null;
  const email = quote ? quoteEmail(quote) : null;

  async function markSentIfDraft() {
    if (quote?.status === 'draft') await updateQuoteStatus(quote.id, 'sent');
    await refresh();
  }

  async function sendWhatsApp() {
    if (!quote || !phone) return;
    setBusy(true);
    try {
      const digits = phone.replace(/\D/g, '');
      const text = encodeURIComponent(buildQuoteMessage(quote));
      await Linking.openURL(`https://wa.me/${digits}?text=${text}`);
      await markSentIfDraft();
    } catch (e) {
      Alert.alert('Could not open WhatsApp', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function sendEmail() {
    if (!quote) return;
    setBusy(true);
    try {
      if (quote.client_id) {
        await logQuoteEmailNotification(quote);
      } else if (email) {
        const subject = encodeURIComponent(`Your Quote${quote.quote_number ? ` ${quote.quote_number}` : ''}`);
        const body = encodeURIComponent(buildQuoteMessage(quote));
        await Linking.openURL(`mailto:${email}?subject=${subject}&body=${body}`);
      } else {
        return;
      }
      await markSentIfDraft();
    } catch (e) {
      Alert.alert('Could not send email', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Quote" title={quote?.quote_number ?? 'Draft Quote'} />

      {quote ? (
        <View className="gap-4 px-6">
          <Card>
            <View className="flex-row items-center justify-between">
              <Typography variant="subtitle">{quoteClientLabel(quote)}</Typography>
              <Badge label={titleCase(quote.status)} tone={QUOTE_TONE[quote.status]} />
            </View>
            {quote.historical_client_name ? (
              <Typography variant="caption" className="mt-1 text-silver">Walk-in client (no app account)</Typography>
            ) : null}
            {quote.valid_until ? (
              <Typography variant="caption" className="mt-1">
                Valid until {new Date(quote.valid_until).toLocaleDateString()}
              </Typography>
            ) : null}
            {quote.converted_invoice_id ? (
              <Typography
                variant="caption"
                className="mt-2 text-success underline"
                onPress={() =>
                  router.push({ pathname: '/(admin)/finance/invoices/[id]', params: { id: quote.converted_invoice_id! } })
                }
              >
                View converted invoice →
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
              <Button label="Mark Sent" variant="outline" onPress={() => setStatus('sent')} loading={busy} />
              <Button label="Accepted" variant="outline" onPress={() => setStatus('accepted')} loading={busy} />
              <Button label="Declined" variant="danger" onPress={() => setStatus('declined')} loading={busy} />
            </View>
          </View>

          {canSend ? (
            <View className="gap-2">
              <Typography variant="label">Send to client</Typography>
              <View className="flex-row flex-wrap gap-2">
                <Button
                  label="Send via WhatsApp"
                  variant="outline"
                  onPress={sendWhatsApp}
                  loading={busy}
                  disabled={!phone}
                />
                <Button
                  label="Send via Email"
                  variant="outline"
                  onPress={sendEmail}
                  loading={busy}
                  disabled={!quote.client_id && !email}
                />
              </View>
              {!phone ? (
                <Typography variant="caption" className="text-silver">
                  No phone number on file — WhatsApp send disabled.
                </Typography>
              ) : null}
              {!quote.client_id && !email ? (
                <Typography variant="caption" className="text-silver">
                  No email on file for this walk-in client — email send disabled.
                </Typography>
              ) : null}
            </View>
          ) : null}

          <Button
            label={
              quote.converted_invoice_id
                ? 'Already converted to invoice'
                : `Convert to Invoice · ${formatPrice(quote.total)}`
            }
            onPress={generateInvoice}
            loading={busy}
            disabled={!canConvert}
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
