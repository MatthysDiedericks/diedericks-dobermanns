import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';

import { Typography } from '@/components/ui/Typography';
import { intervalPlain } from '@/lib/finance/recurringInvoiceDates';
import { REVENUE_TYPE_LABELS, parseRevenueType } from '@/lib/finance/quoteTypes';

export function RecurringInvoiceSourceLine({
  scheduleId,
  description,
  interval,
  invoiceType,
}: {
  scheduleId: string;
  description: string;
  interval: string;
  invoiceType: string;
}) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push('/(admin)/finance/invoices/recurring' as never)}
      className="mt-2"
    >
      <Typography variant="caption" className="text-subtle">
        From the recurring schedule: {description} — {intervalPlain(interval)} ·{' '}
        {REVENUE_TYPE_LABELS[parseRevenueType(invoiceType)]}
      </Typography>
    </Pressable>
  );
}
