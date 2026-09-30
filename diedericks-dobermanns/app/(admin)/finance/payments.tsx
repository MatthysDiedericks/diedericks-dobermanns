import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useAuthStore } from '@/stores/authStore';
import {
  accountLabel,
  applyRevenueBasis,
  basisCaption,
  basisTotal,
  defaultRevenueBasis,
  formatReceiptAmount,
  rowsForAccountant,
  type RevenueBasis,
} from '@/lib/finance/cashReceipts';
import { formatDate } from '@/lib/finance/formatters';
import { requireSupabase } from '@/lib/supabase';

type Row = {
  id: string;
  amount: number;
  paymentDate: string;
  clientName: string;
  invoiceNumber: string;
  accountId: string | null;
  accountName: string;
  accountType: string;
};

const FILTERS: RevenueBasis[] = ['all', 'bank', 'cash', 'unassigned'];

export default function ReceiptsScreen() {
  const role = useAuthStore((s) => s.profile?.role);
  const [basis, setBasis] = useState<RevenueBasis>(defaultRevenueBasis(role));
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = requireSupabase();
    const { data, error: loadError } = await supabase
      .from('accountant_payment_register' as never)
      .select('*' as never);
    if (loadError) {
      setError(loadError.message);
      return;
    }
    setRows(
      rowsForAccountant((data ?? []) as unknown as Array<Record<string, unknown>>).map((row) => ({
        id: String(row.id),
        amount: Number(row.amount ?? 0),
        paymentDate: String(row.payment_date ?? '').slice(0, 10),
        clientName: String(row.client_name ?? ''),
        invoiceNumber: String(row.invoice_number ?? ''),
        accountId: (row.payment_account_id as string | null) ?? null,
        accountName: String(row.account_name ?? ''),
        accountType: String(row.account_type ?? ''),
      })),
    );
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => applyRevenueBasis(rows, basis), [rows, basis]);

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Finance" title="Receipts" />
      <View className="gap-3 px-6 pb-12">
        <View className="flex-row flex-wrap gap-2">
          {FILTERS.map((filter) => (
            <Pressable
              key={filter}
              onPress={() => setBasis(filter)}
              className={`rounded-full border px-3 py-1 ${basis === filter ? 'border-gold bg-gold/20' : 'border-gold/30'}`}
            >
              <Typography variant="caption">{filter === 'all' ? 'All revenue' : filter}</Typography>
            </Pressable>
          ))}
        </View>
        <Typography variant="caption" className="text-subtle">
          {basisCaption(basis)}
        </Typography>
        <Typography variant="subtitle" className="text-gold">
          {formatReceiptAmount(basisTotal(visible))}
        </Typography>
        {visible.map((row) => (
          <View key={row.id} className="rounded-sm border border-gold/20 p-3">
            <Typography variant="body">
              {formatReceiptAmount(row.amount)} · {row.clientName || '—'}
            </Typography>
            <Typography variant="caption" className="text-subtle">
              {formatDate(row.paymentDate)} · {row.invoiceNumber} · {accountLabel(row.accountName, row.accountType)}
            </Typography>
          </View>
        ))}
        {error ? <Typography variant="caption" className="text-danger">{error}</Typography> : null}
      </View>
    </ScreenContainer>
  );
}
