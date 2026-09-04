import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { formatAmount } from '@/lib/finance/formatters';
import { owingFooterLabel, quoteListMoneyTotals, type QuoteBalanceFields } from '@/lib/finance/quoteBalance';

export function QuotesListTotals({ rows }: { rows: QuoteBalanceFields[] }) {
  const t = quoteListMoneyTotals(rows);
  return (
    <View className="mt-2 border-t-2 border-gold px-1 pt-3">
      <Typography variant="label" className="text-ink">
        {owingFooterLabel(t.owingCount)}
      </Typography>
      <View className="mt-2 gap-1">
        <Typography variant="body">Total {formatAmount(t.total)}</Typography>
        <Typography variant="body">Paid {formatAmount(t.paid)}</Typography>
        <Typography variant="body" className="text-gold">
          Balance due {formatAmount(t.balance)}
        </Typography>
      </View>
    </View>
  );
}
