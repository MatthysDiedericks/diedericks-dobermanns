import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { formatReceiptAmount, pettyCashAccount, type PaymentAccountOption } from '@/lib/finance/cashReceipts';
import { formatDate } from '@/lib/finance/formatters';
import { requireSupabase } from '@/lib/supabase';

type Row = {
  id: string;
  paymentDate: string;
  amount: number;
  method: string;
  invoiceNumber: string;
  clientName: string;
};

export default function AssignAccountsScreen() {
  const [rows, setRows] = useState<Row[]>([]);
  const [accounts, setAccounts] = useState<PaymentAccountOption[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = requireSupabase();
    const [payments, accountRows] = await Promise.all([
      supabase
        .from('invoice_payments')
        .select('id, amount, payment_date, payment_method, payment_account_id, invoices(invoice_number, historical_client_name)')
        .is('payment_account_id', null)
        .order('payment_date', { ascending: false }),
      supabase.from('payment_accounts').select('id, name, account_type').eq('is_active', true).order('sort_order'),
    ]);
    if (payments.error) {
      setError(payments.error.message);
      return;
    }
    if (accountRows.error) {
      setError(accountRows.error.message);
      return;
    }
    setAccounts(
      (accountRows.data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        accountType: row.account_type,
      })),
    );
    setRows(
      (payments.data ?? []).map((row) => {
        const invoice = Array.isArray(row.invoices) ? row.invoices[0] : row.invoices;
        return {
          id: row.id,
          paymentDate: String(row.payment_date).slice(0, 10),
          amount: Number(row.amount ?? 0),
          method: row.payment_method ?? '',
          invoiceNumber: invoice?.invoice_number ?? '',
          clientName: invoice?.historical_client_name?.trim() ?? '',
        };
      }),
    );
    setError(null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const petty = pettyCashAccount(accounts);

  return (
    <ScreenContainer>
      <PageHeader title="Assign accounts" />
      <ScrollView className="px-6" contentContainerStyle={{ paddingBottom: 48 }}>
        <Typography variant="caption" className="mb-4 text-muted">
          {rows.length} receipts have no account. Cash may suggest Petty Cash. Nothing is saved until you assign it.
        </Typography>
        {error ? (
          <Typography variant="caption" className="mb-4 text-danger">
            {error}
          </Typography>
        ) : null}
        {rows.map((row) => (
          <AssignRow
            key={row.id}
            row={row}
            accounts={accounts}
            suggestedId={row.method === 'cash' ? (petty?.id ?? '') : ''}
            onDone={load}
          />
        ))}
      </ScrollView>
    </ScreenContainer>
  );
}

function AssignRow({
  row,
  accounts,
  suggestedId,
  onDone,
}: {
  row: Row;
  accounts: PaymentAccountOption[];
  suggestedId: string;
  onDone: () => void;
}) {
  const [accountId, setAccountId] = useState(suggestedId);
  const [error, setError] = useState<string | null>(null);

  async function save(id: string) {
    const { error: writeError } = await requireSupabase()
      .from('invoice_payments')
      .update({ payment_account_id: id })
      .eq('id', row.id)
      .is('payment_account_id', null);
    if (writeError) {
      setError(writeError.message);
      return;
    }
    onDone();
  }

  return (
    <Card className="mb-3">
      <Typography variant="body">
        {formatDate(row.paymentDate)} · {row.clientName || 'Client not named'} · {row.invoiceNumber}
      </Typography>
      <Typography variant="label" className="text-gold">
        {formatReceiptAmount(row.amount)} · {row.method || 'method not recorded'}
      </Typography>
      {suggestedId ? (
        <Typography variant="caption" className="text-subtle">
          Suggested: Petty Cash. Choose it, then assign.
        </Typography>
      ) : null}
      <View className="mt-2">
        {accounts.map((account) => (
          <Pressable key={account.id} onPress={() => setAccountId(account.id)} className="py-1">
            <Typography variant="caption" className={accountId === account.id ? 'text-gold' : 'text-muted'}>
              {account.name} · {account.accountType}
            </Typography>
          </Pressable>
        ))}
      </View>
      <Pressable disabled={!accountId} onPress={() => void save(accountId)} className="mt-2">
        <Typography variant="caption" className="text-gold">
          Assign
        </Typography>
      </Pressable>
      {error ? (
        <Typography variant="caption" className="mt-1 text-danger">
          {error}
        </Typography>
      ) : null}
    </Card>
  );
}
