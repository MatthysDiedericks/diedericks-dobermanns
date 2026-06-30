import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { progressBarColor } from '@/lib/finance/budgetQueries';
import { formatAmount } from '@/lib/finance/formatters';

interface BudgetCategoryRowProps {
  name: string;
  colour: string;
  budgeted: number;
  actual: number;
}

export function BudgetCategoryRow({ name, colour, budgeted, actual }: BudgetCategoryRowProps) {
  const pct = budgeted > 0 ? (actual / budgeted) * 100 : actual > 0 ? 100 : 0;
  const colors = progressBarColor(pct);
  const barWidth = `${Math.min(pct, 100)}%`;

  return (
    <View className="mb-4 rounded-xl border border-gold/20 bg-black-rich p-3">
      <View className="mb-2 flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center gap-2">
          <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colour }} />
          <Typography variant="body" numberOfLines={1}>
            {name}
          </Typography>
        </View>
        <View className="items-end">
          <Typography variant="caption" className="text-subtle">
            {formatAmount(budgeted)} · {formatAmount(actual)}
          </Typography>
        </View>
      </View>
      <View className="h-2 overflow-hidden rounded-full bg-surface">
        <View className={`h-2 rounded-full ${colors.bar}`} style={{ width: barWidth as `${number}%` }} />
      </View>
      <Typography variant="caption" className={`mt-1 ${colors.text}`}>
        {budgeted > 0 ? `${pct.toFixed(0)}% of budget` : 'No budget set'}
      </Typography>
    </View>
  );
}
