import { Pressable, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { formatAmount, formatDate } from '@/lib/finance/formatters';
import type { StatementRow } from '@/lib/finance/invoiceHtml';

type Props = {
  totalInvoiced: number;
  totalPaid: number;
  outstanding: number;
  ledger: StatementRow[];
  onDownload?: () => void;
  downloading?: boolean;
  downloadDisabled?: boolean;
};

/** Statement totals + chronological ledger above the portal invoice list. */
export function StatementSummary({
  totalInvoiced,
  totalPaid,
  outstanding,
  ledger,
  onDownload,
  downloading,
  downloadDisabled,
}: Props) {
  return (
    <View className="mb-4 gap-3">
      <Card>
        <Typography variant="label" className="mb-3 text-gold">
          Statement summary
        </Typography>
        <View className="flex-row justify-between mb-2">
          <Typography variant="body">Total invoiced</Typography>
          <Typography variant="label">{formatAmount(totalInvoiced)}</Typography>
        </View>
        <View className="flex-row justify-between mb-2">
          <Typography variant="body">Total paid</Typography>
          <Typography variant="label" className="text-success">
            {formatAmount(totalPaid)}
          </Typography>
        </View>
        <View className="flex-row justify-between">
          <Typography variant="body">Outstanding</Typography>
          <Typography
            variant="label"
            className={outstanding > 0 ? 'text-danger' : 'text-success'}
          >
            {formatAmount(outstanding)}
          </Typography>
        </View>
        {onDownload ? (
          <Pressable
            onPress={onDownload}
            disabled={downloading || downloadDisabled}
            accessibilityHint={downloadDisabled ? 'Disabled in preview.' : undefined}
            className="mt-4"
          >
            <Typography variant="caption" className={downloadDisabled ? 'text-gold/40' : 'text-gold'}>
              {downloading ? 'Preparing statement…' : 'Download statement'}
            </Typography>
          </Pressable>
        ) : (
          <Typography variant="caption" className="mt-3 text-subtle">
            PDF download is available on the website portal.
          </Typography>
        )}
      </Card>

      {ledger.length > 0 ? (
        <Card>
          <Typography variant="label" className="mb-3 text-gold">
            Account ledger
          </Typography>
          {ledger.map((row, idx) => (
            <View
              key={`${row.date}-${row.reference}-${idx}`}
              className="mb-2 border-b border-gold/10 pb-2"
            >
              <View className="flex-row justify-between">
                <Typography variant="caption">{formatDate(row.date)}</Typography>
                <Typography variant="caption" className="font-mono text-gold">
                  {row.reference}
                </Typography>
              </View>
              <Typography variant="body" className="mt-0.5">
                {row.description}
              </Typography>
              <View className="mt-1 flex-row justify-between">
                <Typography variant="caption" className="text-subtle">
                  {row.debit > 0
                    ? `Charge ${formatAmount(row.debit)}`
                    : `Payment ${formatAmount(row.credit)}`}
                </Typography>
                <Typography variant="caption">Bal {formatAmount(row.balance)}</Typography>
              </View>
            </View>
          ))}
        </Card>
      ) : null}
    </View>
  );
}
