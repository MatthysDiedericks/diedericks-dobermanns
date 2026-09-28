import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useExpenses } from '@/hooks/useExpenses';
import { allocationTypeLabel, normalizeAllocationType } from '@/lib/finance/allocation';
import { expenseGross } from '@/lib/finance/expenseGross';
import { formatAmount, formatDate } from '@/lib/finance/formatters';

export default function FinancePurchasesScreen() {
  const router = useRouter();
  const { data: expenses, loading } = useExpenses();
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return expenses.filter((e) => {
      if (!q) return true;
      return (
        (e.supplier_name ?? '').toLowerCase().includes(q) ||
        (e.invoice_reference ?? '').toLowerCase().includes(q) ||
        (e.description ?? '').toLowerCase().includes(q) ||
        (e.categoryName ?? '').toLowerCase().includes(q)
      );
    });
  }, [expenses, search]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, e) => {
          acc.net += Number(e.amount ?? 0);
          acc.vat += Number(e.vat_amount ?? 0);
          acc.total += expenseGross(e);
          return acc;
        },
        { net: 0, vat: 0, total: 0 },
      ),
    [rows],
  );

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Finance" title="Purchase invoices" />

      <View className="mb-4 px-6">
        <Input
          value={search}
          onChangeText={setSearch}
          placeholder="Search supplier or their invoice number…"
        />
        <Typography variant="caption" className="mt-2">
          {rows.length} of {expenses.length} · Net {formatAmount(totals.net)} · VAT{' '}
          {formatAmount(totals.vat)} · Total {formatAmount(totals.total)}
        </Typography>
      </View>

      {loading ? <CardListSkeleton count={5} /> : null}

      <ScrollView className="px-6 pb-24">
        {!loading && rows.length === 0 ? (
          <EmptyState title="No purchase invoices" message="Log an expense to see it here." />
        ) : null}
        <View className="gap-3">
          {rows.map((exp) => (
            <Pressable
              key={exp.id}
              onPress={() =>
                router.push({
                  pathname: '/(admin)/finance/expenses/new',
                  params: { expenseId: exp.id },
                })
              }
            >
              <Card>
                <View className="flex-row items-start justify-between">
                  <View className="flex-1">
                    <Typography variant="subtitle">
                      {exp.supplier_name || exp.creditor_name || 'No supplier'}
                    </Typography>
                    <Typography variant="caption" className="font-mono">
                      {exp.invoice_reference || 'No supplier number'}
                    </Typography>
                    <Typography variant="caption" className="mt-1">
                      {exp.categoryName} · {formatDate(exp.expense_date)} ·{' '}
                      {allocationTypeLabel(normalizeAllocationType(exp.allocation_type))}
                    </Typography>
                    <Typography variant="caption">
                      {exp.receipt_url ? 'Receipt attached' : 'No receipt'}
                    </Typography>
                  </View>
                  <View className="items-end">
                    <Typography variant="label">{formatAmount(expenseGross(exp))}</Typography>
                    <Typography variant="caption">
                      VAT {formatAmount(exp.vat_amount ?? 0)}
                    </Typography>
                  </View>
                </View>
              </Card>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
