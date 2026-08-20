import { useRouter } from 'expo-router';
import { Alert, View } from 'react-native';

import { RecordPaymentEntry } from '@/components/finance/RecordPaymentEntry';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { linkQuoteContactFromApplication } from '@/lib/finance/linkQuoteContact';
import { convertQuoteToInvoice } from '@/lib/finance/quoteQueries';
import { formatPrice } from '@/lib/format';
import type { Quote } from '@/types/app.types';

export function QuoteConvertActions({
  quote,
  busy,
  setBusy,
  onLinked,
}: {
  quote: Quote;
  busy: boolean;
  setBusy: (v: boolean) => void;
  onLinked: () => Promise<void>;
}) {
  const router = useRouter();
  const canConvert =
    !quote.converted_invoice_id && (quote.status === 'sent' || quote.status === 'accepted');

  return (
    <View className="gap-2">
      {!quote.contact_id && quote.application_id ? (
        <Button
          label="Link contact from application"
          variant="outline"
          loading={busy}
          onPress={() => {
            void (async () => {
              setBusy(true);
              try {
                await linkQuoteContactFromApplication(quote.id);
                await onLinked();
              } catch (e) {
                Alert.alert('Could not link contact', e instanceof Error ? e.message : 'Try again.');
              } finally {
                setBusy(false);
              }
            })();
          }}
        />
      ) : null}
      {!quote.contact_id ? (
        <Typography variant="caption" className="text-gold">
          Link a contact before sending. Drafts can wait; a quote cannot go out to nobody.
        </Typography>
      ) : null}
      <Button
        label={
          quote.converted_invoice_id
            ? 'Already converted to invoice'
            : `Convert to Invoice · ${formatPrice(quote.total)}`
        }
        onPress={() => {
          void (async () => {
            setBusy(true);
            try {
              const invoiceId = await convertQuoteToInvoice(quote.id);
              router.replace({
                pathname: '/(admin)/finance/invoices/[id]',
                params: { id: invoiceId },
              });
            } catch (e) {
              Alert.alert(
                'Could not convert to invoice',
                e instanceof Error ? e.message : 'Please try again.',
              );
            } finally {
              setBusy(false);
            }
          })();
        }}
        loading={busy}
        disabled={!canConvert}
        fullWidth
      />
      <RecordPaymentEntry invoiceId={quote.converted_invoice_id} onSaved={onLinked} />
    </View>
  );
}
