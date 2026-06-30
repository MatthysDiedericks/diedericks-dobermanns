import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { formatAmount } from '@/lib/finance/formatters';

interface Breakdown {
  general: number;
  dog: number;
  litter: number;
  total: number;
}

interface Props {
  breakdown: Breakdown;
}

const ROWS: { key: keyof Omit<Breakdown, 'total'>; label: string; color: string }[] = [
  { key: 'general', label: 'General', color: Colors.gold },
  { key: 'dog', label: 'Dog-specific', color: Colors.goldLight },
  { key: 'litter', label: 'Litter-specific', color: Colors.goldMuted },
];

export function ExpenseAllocationBreakdown({ breakdown }: Props) {
  if (breakdown.total <= 0) return null;

  return (
    <View className="mb-6">
      <Typography variant="label" className="mb-3 text-gold">
        Expense allocation
      </Typography>
      {ROWS.map(({ key, label, color }) => {
        const amount = breakdown[key];
        const pct = breakdown.total > 0 ? (amount / breakdown.total) * 100 : 0;
        return (
          <View key={key} className="mb-3">
            <View className="mb-1 flex-row justify-between">
              <Typography variant="body">{label}</Typography>
              <Typography variant="label">
                {formatAmount(amount)} ({pct.toFixed(0)}%)
              </Typography>
            </View>
            <View className="h-2 overflow-hidden rounded-full bg-surface">
              <View
                className="h-full rounded-full"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}
