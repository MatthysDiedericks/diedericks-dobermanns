import { ScrollView, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { formatAmount, formatDate } from '@/lib/finance/formatters';
import {
  exceptionListLabel,
  type AllocationReconciliation,
} from '@/lib/finance/reconcileAllocations';

const ROWS: { key: 'company' | 'dog' | 'litter' | 'shared'; label: string }[] = [
  { key: 'company', label: 'Company' },
  { key: 'dog', label: 'Dog' },
  { key: 'litter', label: 'Litter' },
  { key: 'shared', label: 'Shared' },
];

export function ExpenseAllocationReconciliation({
  report,
}: {
  report: AllocationReconciliation;
}) {
  const ok = report.linesMatchHeader && report.exceptions.length === 0;
  return (
    <Card>
      <Typography variant="label" className="mb-1">
        Expense reconciliation
      </Typography>
      <Typography variant="caption" className="mb-3">
        Total expenses = company + dog + litter + shared.
      </Typography>
      {ROWS.map((row) => (
        <View key={row.key} className="mb-1 flex-row justify-between">
          <Typography variant="body">{row.label}</Typography>
          <Typography variant="body">{formatAmount(report.byKind[row.key])}</Typography>
        </View>
      ))}
      <View className="mt-2 flex-row justify-between border-t border-gold/20 pt-2">
        <Typography variant="label">Four kinds</Typography>
        <Typography variant="label">{formatAmount(report.total)}</Typography>
      </View>
      {report.headerTotal != null ? (
        <Typography variant="caption" className="mt-1">
          Headers {formatAmount(report.headerTotal)}
          {report.linesMatchHeader ? ' — matches' : ' — does not match lines'}
        </Typography>
      ) : null}
      {ok ? (
        <Typography variant="caption" className="mt-3 text-green-400">
          Balanced. No unsplit lines.
        </Typography>
      ) : (
        <View className="mt-3">
          <Typography variant="caption" className="text-danger">
            {report.exceptions.length} line{report.exceptions.length === 1 ? '' : 's'} with
            no allocation, or whose allocations do not sum to the line.
          </Typography>
          <ScrollView className="mt-2 max-h-48">
            {report.exceptions.map((row) => (
              <Typography key={row.lineId} variant="caption" className="mb-1">
                {formatDate(row.expenseDate)} · {formatAmount(row.lineAmount)} ·{' '}
                {row.supplierName ?? 'no supplier'} · {row.description} —{' '}
                {exceptionListLabel(row)}
              </Typography>
            ))}
          </ScrollView>
        </View>
      )}
    </Card>
  );
}
