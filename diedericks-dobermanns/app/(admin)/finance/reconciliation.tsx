import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import {
  buildReconciliationSummary,
  formatReceiptAmount,
  suggestMatches,
} from '@/lib/finance/cashReceipts';
import { requireSupabase } from '@/lib/supabase';

type Account = { id: string; name: string; accountType: string };
type Statement = { id: string; accountId: string; accountName: string; periodStart: string; periodEnd: string };
type Line = {
  id: string;
  statementId: string;
  date: string;
  amount: number;
  matchedPaymentId: string | null;
  matchedExpenseId: string | null;
};
type Payment = {
  id: string;
  accountId: string | null;
  accountType: string;
  date: string;
  amount: number;
  bankedOn: string | null;
  label: string;
};

export default function ReconciliationScreen() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState('');
  const [statements, setStatements] = useState<Statement[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = requireSupabase();
    const [accountRes, statementRes, lineRes, paymentRes] = await Promise.all([
      supabase.from('payment_accounts').select('id, name, account_type').eq('is_active', true),
      supabase.from('accountant_bank_statements' as never).select('*' as never),
      supabase.from('accountant_bank_statement_lines' as never).select('*' as never),
      supabase.from('accountant_payment_register' as never).select('*' as never),
    ]);
    const failure = accountRes.error ?? statementRes.error ?? lineRes.error ?? paymentRes.error;
    if (failure) {
      setError(failure.message);
      return;
    }
    const nextAccounts = (accountRes.data ?? []).map((row) => ({
      id: row.id,
      name: row.name,
      accountType: row.account_type,
    }));
    setAccounts(nextAccounts);
    setAccountId((current) => current || nextAccounts.find((row) => row.accountType === 'bank')?.id || '');
    setStatements(
      ((statementRes.data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => ({
        id: String(row.id),
        accountId: String(row.account_id),
        accountName: String(row.account_name ?? ''),
        periodStart: String(row.period_start).slice(0, 10),
        periodEnd: String(row.period_end).slice(0, 10),
      })),
    );
    setLines(
      ((lineRes.data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => ({
        id: String(row.id),
        statementId: String(row.statement_id),
        date: String(row.transaction_date).slice(0, 10),
        amount: Number(row.amount ?? 0),
        matchedPaymentId: (row.matched_payment_id as string | null) ?? null,
        matchedExpenseId: (row.matched_expense_id as string | null) ?? null,
      })),
    );
    setPayments(
      ((paymentRes.data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => ({
        id: String(row.id),
        accountId: (row.payment_account_id as string | null) ?? null,
        accountType: String(row.account_type ?? ''),
        date: String(row.payment_date).slice(0, 10),
        amount: Number(row.amount ?? 0),
        bankedOn: row.banked_on ? String(row.banked_on).slice(0, 10) : null,
        label: String(row.invoice_number ?? row.id),
      })),
    );
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const banks = accounts.filter((account) => account.accountType === 'bank');
  const account = banks.find((row) => row.id === accountId) ?? banks[0];
  const statement = statements.find((row) => row.accountId === account?.id) ?? null;
  const statementLines = lines.filter((line) => line.statementId === statement?.id);
  const summary = useMemo(() => {
    if (!account) return null;
    return buildReconciliationSummary({
      lines: statementLines,
      payments: payments.filter(
        (payment) => payment.accountId === account.id || payment.accountType === 'cash',
      ),
      accountName: account.name,
      paymentsWithNoAccount: payments.filter((payment) => !payment.accountId).length,
      cashOnHand: payments
        .filter((payment) => payment.accountType === 'cash' && !payment.bankedOn)
        .reduce((sum, payment) => sum + payment.amount, 0),
    });
  }, [account, statementLines, payments]);

  const suggestions = statement
    ? suggestMatches(
        statementLines,
        payments
          .filter((payment) => payment.accountId === account?.id && payment.accountType === 'bank')
          .map((payment) => ({ ...payment, label: payment.id })),
        [],
      )
    : [];

  const confirm = async (lineId: string, paymentId: string | null) => {
    const supabase = requireSupabase();
    const { error: rpcError } = await supabase.rpc('confirm_statement_match' as never, {
      p_line_id: lineId,
      p_payment_id: paymentId,
      p_expense_id: null,
      p_note: 'Confirmed',
    } as never);
    if (rpcError) {
      setError(rpcError.message);
      return;
    }
    await load();
  };

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Finance" title="Reconciliation" />
      <View className="gap-3 px-6 pb-12">
        <View className="flex-row flex-wrap gap-2">
          {banks.map((bank) => (
            <Pressable
              key={bank.id}
              onPress={() => setAccountId(bank.id)}
              className={`rounded-full border px-3 py-1 ${account?.id === bank.id ? 'border-gold bg-gold/20' : 'border-gold/30'}`}
            >
              <Typography variant="caption">{bank.name}</Typography>
            </Pressable>
          ))}
        </View>
        {summary ? (
          <>
            <Typography variant="caption" className="text-gold">
              {summary.scopeNote}
            </Typography>
            <Typography variant="body">Matched to a payment: {summary.matchedToPayment}</Typography>
            <Typography variant="body">No match: {summary.unmatchedLines}</Typography>
            <Typography variant="body">Payments not on a statement: {summary.paymentsNotOnStatement}</Typography>
            <Typography variant="body">No account assigned: {summary.paymentsWithNoAccount}</Typography>
            <Typography variant="body">Cash on hand: {formatReceiptAmount(summary.cashOnHand)}</Typography>
          </>
        ) : (
          <Typography variant="caption" className="text-subtle">
            No bank account to reconcile.
          </Typography>
        )}
        {suggestions.map((suggestion) => (
          <Pressable
            key={`${suggestion.lineId}-${suggestion.paymentId}`}
            onPress={() => void confirm(suggestion.lineId, suggestion.paymentId)}
            className="rounded-sm border border-gold/30 p-3"
          >
            <Typography variant="caption">
              Confirm {formatReceiptAmount(statementLines.find((line) => line.id === suggestion.lineId)?.amount ?? 0)} ·{' '}
              {suggestion.days} days apart
            </Typography>
          </Pressable>
        ))}
        {error ? <Typography variant="caption" className="text-danger">{error}</Typography> : null}
      </View>
    </ScreenContainer>
  );
}
