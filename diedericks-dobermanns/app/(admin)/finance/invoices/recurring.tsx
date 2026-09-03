import { useRouter } from 'expo-router';
import { Alert, ScrollView, View } from 'react-native';
import { useCallback, useEffect, useState } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { formatAmount } from '@/lib/finance/formatters';
import {
  fetchRecurringInvoices,
  generateDueRecurringInvoices,
  setRecurringInvoiceActive,
} from '@/lib/finance/recurringInvoiceQueries';
import { intervalPlain, previewIssueCopy } from '@/lib/finance/recurringInvoiceDates';
import type { RecurringInvoice } from '@/lib/finance/recurringInvoiceTypes';
import { REVENUE_TYPE_LABELS, parseRevenueType } from '@/lib/finance/quoteTypes';

export default function RecurringInvoicesScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<RecurringInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await fetchRecurringInvoices());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function confirm(id: string, label: string, active: boolean) {
    Alert.alert(active ? 'Pause schedule?' : 'Resume schedule?', label, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: active ? 'Pause' : 'Resume',
        onPress: () => void setRecurringInvoiceActive(id, !active).then(load),
      },
    ]);
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Finance" title="Recurring invoices" />
      <View className="px-6 pb-3">
        <Button
          label="Generate due drafts"
          size="sm"
          variant="outline"
          onPress={() => {
            void generateDueRecurringInvoices()
              .then((n) => {
                Alert.alert('Drafts', `${n} draft invoice(s) created. Nothing was emailed.`);
                void load();
              })
              .catch((e: unknown) =>
                Alert.alert('Generate failed', e instanceof Error ? e.message : 'Try again.'),
              );
          }}
        />
      </View>
      {loading ? (
        <View className="px-6">
          <CardListSkeleton count={3} />
        </View>
      ) : error ? (
        <View className="px-6">
          <Typography variant="body" className="mb-3 text-danger">{error}</Typography>
          <Button label="Retry" size="sm" variant="outline" onPress={() => void load()} />
        </View>
      ) : (
        <ScrollView className="px-6 pb-12" showsVerticalScrollIndicator={false}>
          {rows.map((row) => (
            <Card key={row.id} className="mb-3 border border-gold/20 bg-black-rich">
              <Typography variant="body">{row.description}</Typography>
              <Typography variant="label" className="mt-1 text-gold">
                {formatAmount(Number(row.amount))} · {intervalPlain(row.recurrence_interval)} ·{' '}
                {REVENUE_TYPE_LABELS[parseRevenueType(row.invoice_type)]}
              </Typography>
              <Typography variant="caption" className="text-subtle">
                {row.contact?.full_name ?? 'Contact'}
              </Typography>
              <Typography variant="caption" className="mb-3 text-subtle">
                {previewIssueCopy(
                  row.next_issue_date,
                  row.recurrence_interval,
                  row.recurrence_end_date,
                  row.occurrences_remaining,
                )}
              </Typography>
              <View className="flex-row gap-2">
                <Button
                  label={row.is_active ? 'Pause' : 'Resume'}
                  size="sm"
                  variant="outline"
                  onPress={() => confirm(row.id, row.description, row.is_active)}
                />
                <Button
                  label="End"
                  size="sm"
                  variant="ghost"
                  onPress={() => void setRecurringInvoiceActive(row.id, false).then(load)}
                />
              </View>
            </Card>
          ))}
          <Button
            label="+ New schedule"
            fullWidth
            onPress={() => router.push('/(admin)/finance/invoices/recurring-new' as never)}
          />
        </ScrollView>
      )}
    </ScreenContainer>
  );
}
