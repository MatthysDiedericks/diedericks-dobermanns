import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { progressBarColor } from '@/lib/finance/budgetQueries';
import { formatAmount } from '@/lib/finance/formatters';
import type { BudgetLineItem } from '@/types/finance';

interface BudgetCategoryRowProps {
  name: string;
  colour: string;
  budgeted: number;
  actual: number;
  /** Line items for this category+year — presence means the category is itemized. */
  items?: BudgetLineItem[];
  /** Currently selected view — null = annual, else 1-12. Used to filter the breakdown shown. */
  month?: number | null;
}

export function BudgetCategoryRow({ name, colour, budgeted, actual, items = [], month = null }: BudgetCategoryRowProps) {
  const [expanded, setExpanded] = useState(false);
  const pct = budgeted > 0 ? (actual / budgeted) * 100 : actual > 0 ? 100 : 0;
  const colors = progressBarColor(pct);
  const barWidth = `${Math.min(pct, 100)}%`;
  const itemized = items.length > 0;

  const visibleItems = itemized
    ? month == null
      ? items
      : items.filter((i) => i.month == null || i.month === month)
    : [];

  return (
    <Pressable
      onPress={() => (itemized ? setExpanded((v) => !v) : undefined)}
      className="mb-4 rounded-xl border border-gold/20 bg-black-rich p-3"
    >
      <View className="mb-2 flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center gap-2">
          <View className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colour }} />
          <Typography variant="body" numberOfLines={1}>
            {name}
          </Typography>
          {itemized ? (
            <Typography variant="caption" className="text-subtle">
              · {items.length} item{items.length === 1 ? '' : 's'}
            </Typography>
          ) : null}
          {itemized ? (
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={Colors.silver}
            />
          ) : null}
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

      {expanded && itemized ? (
        <View className="mt-3 border-t border-gold/10 pt-2">
          {visibleItems.length === 0 ? (
            <Typography variant="caption" className="text-subtle">
              No items apply to this month
            </Typography>
          ) : (
            visibleItems.map((item) => (
              <View key={item.id} className="flex-row items-center justify-between py-1">
                <Typography variant="caption" numberOfLines={1} className="flex-1 pr-2">
                  {item.name}
                  {item.month != null ? ' (one-off)' : ''}
                </Typography>
                <Typography variant="caption" className="text-subtle">
                  {formatAmount(Number(item.amount))}
                </Typography>
              </View>
            ))
          )}
        </View>
      ) : null}
    </Pressable>
  );
}
