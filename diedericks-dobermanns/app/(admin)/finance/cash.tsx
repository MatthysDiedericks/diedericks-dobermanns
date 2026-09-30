import { useCallback, useEffect, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { formatReceiptAmount } from '@/lib/finance/cashReceipts';
import { formatDate } from '@/lib/finance/formatters';
import { requireSupabase } from '@/lib/supabase';

type Row = {
  id: string;
  amount: number;
  paymentDate: string;
  clientName: string;
  invoiceNumber: string;
  accountName: string;
};

export default function CashOnHandScreen() {
  const [rows, setRows] = useState<Row[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [bankedOn, setBankedOn] = useState('');
  const [reference, setReference] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = requireSupabase();
    const { data, error: loadError } = await supabase
      .from('accountant_cash_on_hand' as never)
      .select('*' as never);
    if (loadError) {
      setError(loadError.message);
      return;
    }
    setError(null);
    setRows(
      ((data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => ({
        id: String(row.id),
        amount: Number(row.amount ?? 0),
        paymentDate: String(row.payment_date ?? '').slice(0, 10),
        clientName: String(row.client_name ?? ''),
        invoiceNumber: String(row.invoice_number ?? ''),
        accountName: String(row.account_name ?? 'Petty Cash'),
      })),
    );
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const total = rows.reduce((sum, row) => sum + row.amount, 0);

  const bank = async () => {
    if (!picked.length || !bankedOn || !reference.trim()) {
      setError('Choose receipts, a deposit date, and a bank reference.');
      return;
    }
    const supabase = requireSupabase();
    const { error: updateError } = await supabase
      .from('invoice_payments')
      .update({ banked_on: bankedOn, banked_reference: reference.trim() })
      .in('id', picked);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setNotice(`${picked.length} receipt${picked.length === 1 ? '' : 's'} banked.`);
    setPicked([]);
    await load();
  };

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Finance" title="Cash on hand" />
      <View className="gap-3 px-6 pb-12">
        <Typography variant="subtitle" className="text-gold">
          {formatReceiptAmount(total)}
        </Typography>
        <Typography variant="caption" className="text-subtle">
          Cash received that has not been deposited.
        </Typography>
        {rows.map((row) => (
          <Pressable
            key={row.id}
            onPress={() =>
              setPicked((current) =>
                current.includes(row.id) ? current.filter((id) => id !== row.id) : [...current, row.id],
              )
            }
            className={`rounded-sm border p-3 ${picked.includes(row.id) ? 'border-gold' : 'border-gold/20'}`}
          >
            <Typography variant="body">
              {formatReceiptAmount(row.amount)} · {row.clientName || '—'}
            </Typography>
            <Typography variant="caption" className="text-subtle">
              {row.invoiceNumber} · {formatDate(row.paymentDate)} · {row.accountName} · cash
            </Typography>
          </Pressable>
        ))}
        <TextInput
          value={bankedOn}
          onChangeText={setBankedOn}
          placeholder="Deposited on YYYY-MM-DD"
          className="rounded-sm border border-gold/30 px-3 py-2 text-cream"
        />
        <TextInput
          value={reference}
          onChangeText={setReference}
          placeholder="Bank reference"
          className="rounded-sm border border-gold/30 px-3 py-2 text-cream"
        />
        <Button label="Bank this cash" onPress={() => void bank()} />
        {notice ? <Typography variant="caption" className="text-success">{notice}</Typography> : null}
        {error ? <Typography variant="caption" className="text-danger">{error}</Typography> : null}
      </View>
    </ScreenContainer>
  );
}
