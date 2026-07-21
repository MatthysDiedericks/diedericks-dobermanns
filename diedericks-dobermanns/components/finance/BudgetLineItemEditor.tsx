import { Ionicons } from '@expo/vector-icons';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { lineItemsTotalForMonth } from '@/lib/finance/budgetQueries';
import { formatAmount } from '@/lib/finance/formatters';
import type { BudgetLineItem } from '@/types/finance';

export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Draft line item shape used while editing in the sheet — amount is text until saved. */
export interface DraftLineItem {
  key: string;
  id?: string;
  name: string;
  amount: string;
  month: number | null;
  sort_order: number;
}

function draftsAsLineItems(items: DraftLineItem[], categoryId: string): BudgetLineItem[] {
  return items.map((it) => ({
    id: it.id ?? it.key,
    category_id: categoryId,
    year: 0,
    month: it.month,
    name: it.name,
    amount: Number(it.amount) || 0,
    sort_order: it.sort_order,
    notes: null,
    created_at: '',
    updated_at: '',
    created_by: null,
  }));
}

/** Annual + "this month" totals computed client-side from draft (unsaved) item state. */
export function computeDraftTotals(items: DraftLineItem[], categoryId: string) {
  const asLineItems = draftsAsLineItems(items, categoryId);
  const currentMonth = new Date().getMonth() + 1;
  return {
    annual: lineItemsTotalForMonth(asLineItems, categoryId, null),
    thisMonth: lineItemsTotalForMonth(asLineItems, categoryId, currentMonth),
    currentMonth,
  };
}

interface BudgetLineItemEditorProps {
  categoryId: string;
  items: DraftLineItem[];
  onChange: (items: DraftLineItem[]) => void;
  onRemove: (item: DraftLineItem) => void;
  onAdd: () => void;
}

export function BudgetLineItemEditor({ categoryId, items, onChange, onRemove, onAdd }: BudgetLineItemEditorProps) {
  const { annual: annualTotal, thisMonth: thisMonthTotal, currentMonth } = computeDraftTotals(items, categoryId);

  const updateItem = (key: string, patch: Partial<DraftLineItem>) => {
    onChange(items.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  };

  return (
    <View className="mb-1 rounded-xl border border-gold/20 bg-surface p-3">
      <Typography variant="caption" className="mb-3 text-gold">
        Annual: {formatAmount(annualTotal)} · This month ({MONTH_NAMES[currentMonth - 1]}): {formatAmount(thisMonthTotal)}
      </Typography>

      {items.map((item) => (
        <View key={item.key} className="mb-3 rounded-lg border border-gold/10 bg-black-rich p-2.5">
          <View className="mb-2 flex-row items-center gap-2">
            <BottomSheetTextInput
              value={item.name}
              onChangeText={(v) => updateItem(item.key, { name: v })}
              placeholder="Item name"
              placeholderTextColor="#9E9E9E"
              className="flex-1 rounded-lg border border-gold/20 bg-surface px-3 py-2 font-body text-sm text-ink"
            />
            <Pressable onPress={() => onRemove(item)} hitSlop={8}>
              <Ionicons name="trash-outline" size={16} color={Colors.silver} />
            </Pressable>
          </View>
          <BottomSheetTextInput
            value={item.amount}
            onChangeText={(v) => updateItem(item.key, { amount: v })}
            keyboardType="numeric"
            placeholder="Amount"
            placeholderTextColor="#9E9E9E"
            className="mb-2 rounded-lg border border-gold/20 bg-surface px-3 py-2 font-body text-sm text-ink"
          />
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => updateItem(item.key, { month: null })}
              className={`flex-1 items-center rounded-lg border px-2 py-1.5 ${
                item.month == null ? 'border-gold bg-gold/15' : 'border-gold/20'
              }`}
            >
              <Typography variant="caption" className={item.month == null ? 'text-gold' : 'text-subtle'}>
                Every month
              </Typography>
            </Pressable>
            <Pressable
              onPress={() => updateItem(item.key, { month: item.month ?? currentMonth })}
              className={`flex-1 items-center rounded-lg border px-2 py-1.5 ${
                item.month != null ? 'border-gold bg-gold/15' : 'border-gold/20'
              }`}
            >
              <Typography variant="caption" className={item.month != null ? 'text-gold' : 'text-subtle'}>
                One-off
              </Typography>
            </Pressable>
          </View>
          {item.month != null ? (
            <View className="mt-2 flex-row flex-wrap gap-1.5">
              {MONTH_NAMES.map((m, idx) => {
                const monthNum = idx + 1;
                const active = item.month === monthNum;
                return (
                  <Pressable
                    key={m}
                    onPress={() => updateItem(item.key, { month: monthNum })}
                    className={`rounded-md border px-2 py-1 ${active ? 'border-gold bg-gold/15' : 'border-gold/20'}`}
                  >
                    <Typography variant="caption" className={active ? 'text-gold' : 'text-subtle'}>
                      {m}
                    </Typography>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>
      ))}

      <Pressable onPress={onAdd} className="items-center rounded-lg border border-dashed border-gold/30 py-2.5">
        <Typography variant="caption" className="text-gold">
          + Add item
        </Typography>
      </Pressable>
    </View>
  );
}
