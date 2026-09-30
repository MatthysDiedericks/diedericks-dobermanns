import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import type { PaymentGapInvoice } from '@/lib/clients/clientRecord';
import { loadPaymentGapLists } from '@/lib/clients/loadSaleLinks';
import { savePaymentGapExplanation } from '@/lib/clients/saleLinkWrites';
import { formatAmount, formatDate } from '@/lib/finance/formatters';
import { requireSupabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

export default function UnrecordedPaymentsScreen() {
  const router = useRouter();
  const canWrite = useAuthStore((s) => s.hasRole('admin', 'super_admin'));
  const [open, setOpen] = useState<PaymentGapInvoice[]>([]);
  const [resolved, setResolved] = useState<PaymentGapInvoice[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    void loadPaymentGapLists(requireSupabase())
      .then((lists) => {
        setOpen(lists.open);
        setResolved(lists.resolved);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load invoices'));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <ScreenContainer scroll={false}>
      <PageHeader title="Paid with no payment record" />
      <ScrollView className="px-6 pb-12">
        <Typography variant="caption" className="mb-4">
          {open.length} still need an explanation. {resolved.length} are resolved. Saving a note does not change the
          amount paid.
        </Typography>
        {error ? <Typography variant="body" className="mb-3 text-danger">{error}</Typography> : null}
        <Typography variant="label" className="mb-2 text-gold">
          NEEDS AN EXPLANATION · {open.length}
        </Typography>
        {open.map((invoice) => (
          <GapCard
            key={invoice.id}
            invoice={invoice}
            canWrite={canWrite}
            onOpen={() =>
              router.push({ pathname: '/(admin)/finance/invoices/[id]', params: { id: invoice.id } })
            }
            onSaved={load}
          />
        ))}
        <Typography variant="label" className="mb-2 mt-6 text-gold">
          RESOLVED · {resolved.length}
        </Typography>
        {resolved.map((invoice) => (
          <Pressable
            key={invoice.id}
            onPress={() =>
              router.push({ pathname: '/(admin)/finance/invoices/[id]', params: { id: invoice.id } })
            }
          >
            <Card className="mb-2">
              <Typography variant="label" className="text-gold">
                {invoice.invoiceNumber}
              </Typography>
              <Typography variant="caption">
                {formatDate(invoice.issueDate)} · {invoice.paymentCount} payment
                {invoice.paymentCount === 1 ? '' : 's'}
              </Typography>
              {invoice.review ? <Typography variant="caption">{invoice.review.note}</Typography> : null}
            </Card>
          </Pressable>
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}

function GapCard({
  invoice,
  canWrite,
  onOpen,
  onSaved,
}: {
  invoice: PaymentGapInvoice;
  canWrite: boolean;
  onOpen: () => void;
  onSaved: () => void;
}) {
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Card className="mb-3">
      <Pressable onPress={onOpen}>
        <Typography variant="label" className="text-gold">
          {invoice.invoiceNumber}
        </Typography>
      </Pressable>
      <Typography variant="caption">
        {formatDate(invoice.issueDate)} · total {formatAmount(invoice.totalAmount)} · paid figure{' '}
        {formatAmount(invoice.amountPaid)}
      </Typography>
      {canWrite ? (
        <View className="mt-2">
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="What actually happened?"
            placeholderTextColor="#8a8478"
            multiline
            className="min-h-16 rounded-sm border border-gold/30 px-3 py-2 text-white"
          />
          {error ? <Typography variant="caption" className="text-danger">{error}</Typography> : null}
          <Button
            label={busy ? 'Saving…' : 'Save explanation'}
            className="mt-2"
            disabled={busy}
            onPress={() => {
              setBusy(true);
              setError(null);
              void savePaymentGapExplanation({ invoiceId: invoice.id, note, resolution: 'explained' })
                .then(onSaved)
                .catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not save'))
                .finally(() => setBusy(false));
            }}
          />
        </View>
      ) : null}
    </Card>
  );
}
