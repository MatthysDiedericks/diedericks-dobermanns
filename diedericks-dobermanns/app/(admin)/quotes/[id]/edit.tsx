import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { AppQuoteBuilder } from '@/components/finance/AppQuoteBuilder';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useQuoteDetail } from '@/hooks/useQuotes';
import { assertQuoteEditable } from '@/lib/finance/quoteEditGuards';

/**
 * Dedicated edit URL so parity matches the website. Reuses the same builder,
 * autosave, and Resume/Start-fresh path as New Quote. Opening this screen
 * must not bump quotes.revision — that only happens on resend.
 */
export default function EditQuoteScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { quote, loading } = useQuoteDetail(id ?? '');

  if (loading) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center">
        <ActivityIndicator color={Colors.gold} />
      </ScreenContainer>
    );
  }

  if (!quote) {
    return (
      <ScreenContainer>
        <PageHeader eyebrow="Quote" title="Edit quote" />
        <View className="px-6">
          <Typography variant="body">Quote not found.</Typography>
          <Button label="Back" variant="outline" className="mt-4" onPress={() => router.back()} />
        </View>
      </ScreenContainer>
    );
  }

  const gate = assertQuoteEditable({
    status: quote.status,
    converted_invoice_id: quote.converted_invoice_id,
  });

  if (!gate.ok) {
    return (
      <ScreenContainer>
        <PageHeader eyebrow="Quote" title={quote.quote_number ?? 'Edit quote'} />
        <View className="px-6">
          <Typography variant="body" className="text-danger">
            {gate.error}
          </Typography>
          {gate.invoiceId ? (
            <Button
              label="Open invoice"
              className="mt-4"
              onPress={() =>
                router.push({
                  pathname: '/(admin)/finance/invoices/[id]',
                  params: { id: gate.invoiceId ?? '' },
                })
              }
            />
          ) : (
            <Button label="Back" variant="outline" className="mt-4" onPress={() => router.back()} />
          )}
        </View>
      </ScreenContainer>
    );
  }

  return <AppQuoteBuilder key={quote.id} initial={quote} />;
}
