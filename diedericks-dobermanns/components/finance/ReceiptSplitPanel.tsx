import { useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import {
  formatReceiptAmount,
  receiptIncomeByMonth,
  splitReceipts,
  type RevenueBasis,
} from '@/lib/finance/cashReceipts';
import { requireSupabase } from '@/lib/supabase';

type Receipt = {
  paymentDate: string;
  amount: number;
  accountType: string;
  accountId: string | null;
};

const LENSES: Array<{ id: RevenueBasis; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'bank', label: 'Bank' },
  { id: 'cash', label: 'Cash' },
  { id: 'unassigned', label: 'Unassigned' },
];

/**
 * A lens on receipts. It does not replace the headline total income card.
 * Unassigned stays its own bucket.
 */
export function ReceiptSplitPanel({
  chartYear,
  onOpenAssign,
  onOpenCash,
  onIncomeLens,
}: {
  chartYear: number;
  onOpenAssign: () => void;
  onOpenCash: () => void;
  /** Null means the monthly chart stays on every receipt. A lens replaces income bars only. */
  onIncomeLens?: (income: number[] | null) => void;
}) {
  const [rows, setRows] = useState<Receipt[]>([]);
  const [cashOnHand, setCashOnHand] = useState(0);
  const [lens, setLens] = useState<RevenueBasis>('all');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = requireSupabase();
    void Promise.all([
      supabase.from('accountant_payment_register' as never).select('*' as never),
      supabase.from('accountant_cash_on_hand' as never).select('amount' as never),
    ]).then(([payments, cash]) => {
      if (payments.error) {
        setError(payments.error.message);
        return;
      }
      setRows(
        ((payments.data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => ({
          paymentDate: String(row.payment_date ?? '').slice(0, 10),
          amount: Number(row.amount ?? 0),
          accountType: String(row.account_type ?? ''),
          accountId: (row.payment_account_id as string | null) ?? null,
        })),
      );
      const cashRows = (cash.data ?? []) as unknown as Array<{ amount: number }>;
      setCashOnHand(cashRows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0));
    });
  }, []);

  const split = splitReceipts(rows);
  const yearRows = rows.filter((row) => row.paymentDate.startsWith(String(chartYear)));
  const months = useMemo(
    () => (lens === 'all' ? null : receiptIncomeByMonth(rows, chartYear, lens)),
    [lens, rows, chartYear],
  );

  useEffect(() => {
    onIncomeLens?.(months);
  }, [months, onIncomeLens]);
  const lensTotal =
    lens === 'all'
      ? yearRows.reduce((sum, row) => sum + row.amount, 0)
      : (months ?? []).reduce((sum, value) => sum + value, 0);

  return (
    <View className="mb-6 px-6">
      <Card>
        <Typography variant="caption" className="text-muted">
          Where receipts landed
        </Typography>
        <Typography variant="caption" className="mt-1 text-subtle">
          Total income above stays on every receipt. This is only a lens.
        </Typography>
        <View className="mt-3 flex-row flex-wrap gap-2">
          {LENSES.map((item) => (
            <Pressable key={item.id} onPress={() => setLens(item.id)} className="mr-2 mb-2">
              <Typography variant="caption" className={lens === item.id ? 'text-gold' : 'text-muted'}>
                {item.label}
              </Typography>
            </Pressable>
          ))}
        </View>
        <Typography variant="caption" className="mt-2">
          {chartYear} in this lens {formatReceiptAmount(lensTotal)}. The income card above does not change.
        </Typography>
        <Typography variant="caption" className="mt-2">
          Bank {formatReceiptAmount(split.bank)} · Cash {formatReceiptAmount(split.cash)}
        </Typography>
        <Pressable onPress={onOpenAssign} className="mt-2">
          <Typography variant="caption" className="text-gold">
            Unassigned · {split.unassignedCount} · {formatReceiptAmount(split.unassigned)}
          </Typography>
        </Pressable>
        {error ? (
          <Typography variant="caption" className="mt-2 text-danger">
            {error}
          </Typography>
        ) : null}
      </Card>
      <Pressable onPress={onOpenCash} className="mt-3">
        <Card>
          <Typography variant="caption" className="text-muted">
            Cash on hand
          </Typography>
          <Typography variant="label" className="mt-1 text-gold">
            {formatReceiptAmount(cashOnHand)}
          </Typography>
          <Typography variant="caption" className="text-subtle">
            Cash received that has not been banked.
          </Typography>
        </Card>
      </Pressable>
    </View>
  );
}
