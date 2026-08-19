import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, TextInput, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { formatAmount } from '@/lib/finance/formatters';
import {
  fetchPendingPaymentProofs,
} from '@/lib/finance/verifyPaymentProof';
import { verifyQuotePaymentProof } from '@/lib/finance/verifyQuoteProof';
import { requireSupabase } from '@/lib/supabase';

type ProofRow = Awaited<ReturnType<typeof fetchPendingPaymentProofs>>[number] & {
  outstanding?: number;
  quoteNumber?: string;
};

export default function PaymentProofsScreen() {
  const [rows, setRows] = useState<ProofRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const pending = await fetchPendingPaymentProofs();
      const supabase = requireSupabase();
      const enriched: ProofRow[] = [];
      for (const p of pending) {
        let outstanding = 0;
        let quoteNumber = p.document_name;
        const quoteId = p.related_quote_id;
        if (quoteId) {
          const { data: q } = await supabase
            .from('quotes')
            .select('quote_number, converted_invoice_id, total')
            .eq('id', quoteId)
            .maybeSingle();
          quoteNumber = q?.quote_number ?? quoteNumber;
          if (q?.converted_invoice_id) {
            const { data: inv } = await supabase
              .from('invoices')
              .select('amount_outstanding')
              .eq('id', q.converted_invoice_id)
              .maybeSingle();
            outstanding = Number(inv?.amount_outstanding ?? q.total ?? 0);
          } else {
            outstanding = Number(q?.total ?? 0);
          }
        }
        enriched.push({ ...p, outstanding, quoteNumber });
      }
      setRows(enriched);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const verify = async (row: ProofRow) => {
    if (!row.related_quote_id) {
      Alert.alert('Cannot verify', 'This proof is not linked to a quote.');
      return;
    }
    const n = Number(amount);
    if (!(n > 0)) {
      Alert.alert('Amount', 'Enter the amount printed on the proof.');
      return;
    }
    setBusyId(row.id);
    try {
      await verifyQuotePaymentProof({
        quoteId: row.related_quote_id,
        documentId: row.id,
        amount: n,
        paymentDate: new Date().toISOString().slice(0, 10),
        method: 'eft',
      });
      setOpenId(null);
      await refresh();
      Alert.alert('Recorded', `${formatAmount(n)} recorded against the invoice.`);
    } catch (e) {
      Alert.alert('Could not verify', e instanceof Error ? e.message : 'Try again.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Finance" title="Awaiting review" />
      {loading ? <CardListSkeleton count={3} /> : null}
      <View className="gap-3 px-6 pb-12">
        {!loading && rows.length === 0 ? (
          <Typography variant="body" className="text-subtle">
            No payment proofs waiting.
          </Typography>
        ) : null}
        {rows.map((row) => (
          <Card key={row.id}>
            <Typography variant="label" className="text-gold">
              {row.quoteNumber}
            </Typography>
            <Typography variant="caption" className="mt-1">
              {row.document_name}
            </Typography>
            <Pressable
              disabled={busyId === row.id}
              onPress={() => {
                setOpenId(row.id);
                setAmount(String(row.outstanding ?? ''));
              }}
              className="mt-3 self-start rounded-full border border-gold/40 px-3 py-1.5"
            >
              <Typography variant="caption" className="text-gold">
                Verify
              </Typography>
            </Pressable>
            {openId === row.id ? (
              <View className="mt-3">
                <Typography variant="caption">Amount on the proof</Typography>
                <TextInput
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  className="mt-1 rounded-sm border border-gold/30 px-3 py-2 text-text"
                />
                <Pressable
                  disabled={busyId === row.id}
                  onPress={() => void verify(row)}
                  className="mt-2 self-start rounded-full bg-gold px-4 py-2"
                >
                  <Typography variant="caption" className="text-black-rich">
                    Record payment
                  </Typography>
                </Pressable>
              </View>
            ) : null}
          </Card>
        ))}
      </View>
    </ScreenContainer>
  );
}
