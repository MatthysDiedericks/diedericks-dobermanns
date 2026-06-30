import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { formatAmount, formatDate } from '@/lib/finance/formatters';
import type { ImportRow } from '@/types/finance';

interface ImportPreviewRowProps {
  row: ImportRow;
}

export function ImportPreviewRow({ row }: ImportPreviewRowProps) {
  const warn = row.unmatchedCategory || !row.valid;
  return (
    <View
      className={`mb-2 flex-row items-center justify-between rounded-lg border px-3 py-2 ${
        warn ? 'border-gold/40 bg-gold/10' : 'border-gold/15 bg-black-rich'
      }`}
    >
      <View className="flex-1 pr-2">
        <Typography variant="caption" className="text-subtle">
          {row.valid ? formatDate(row.date) : row.date || '—'}
        </Typography>
        <Typography variant="body" numberOfLines={1}>
          {row.description || '—'}
        </Typography>
        <Typography variant="caption" className={warn ? 'text-gold' : 'text-subtle'}>
          {row.categoryName}
          {row.error ? ` · ${row.error}` : ''}
        </Typography>
      </View>
      <Typography variant="label" className={row.valid ? 'text-gold' : 'text-danger'}>
        {row.valid ? formatAmount(row.amount) : '—'}
      </Typography>
    </View>
  );
}
