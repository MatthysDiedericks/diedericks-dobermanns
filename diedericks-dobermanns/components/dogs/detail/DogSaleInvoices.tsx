import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import { SectionCard } from '@/components/dogs/detail/SectionCard';
import { Typography } from '@/components/ui/Typography';
import { moneyFromInvoices, type RecordInvoice } from '@/lib/clients/clientRecord';
import { loadDogInvoices } from '@/lib/clients/loadSaleLinks';
import { formatAmount, formatDate } from '@/lib/finance/formatters';
import { requireSupabase } from '@/lib/supabase';

export function DogSaleInvoices({ dogId }: { dogId: string }) {
  const router = useRouter();
  const [invoices, setInvoices] = useState<RecordInvoice[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void loadDogInvoices(requireSupabase(), dogId)
      .then((rows) => {
        if (!cancelled) setInvoices(rows);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load invoices');
      });
    return () => {
      cancelled = true;
    };
  }, [dogId]);

  return (
    <SectionCard title="Invoices">
      {error ? <Typography variant="caption" className="text-danger">{error}</Typography> : null}
      {invoices.length === 0 && !error ? (
        <Typography variant="body">No invoice is linked to this dog.</Typography>
      ) : null}
      {invoices.map((invoice) => {
        const outstanding = moneyFromInvoices([invoice]).outstanding;
        return (
          <Pressable
            key={invoice.id}
            onPress={() =>
              router.push({ pathname: '/(admin)/finance/invoices/[id]', params: { id: invoice.id } })
            }
          >
            <View className="py-2">
              <Typography variant="label" className="text-gold">
                {invoice.invoiceNumber}
              </Typography>
              <Typography variant="caption" className={outstanding !== 0 ? 'text-amber-300' : ''}>
                {formatDate(invoice.issueDate)} · {formatAmount(outstanding)} outstanding
              </Typography>
              {invoice.amountPaid > 0 && invoice.payments.length === 0 ? (
                <Typography variant="caption" className="text-amber-300">
                  Amount paid is set, but there is no payment record.
                </Typography>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </SectionCard>
  );
}
