import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { BudgetLineItemEditor, computeDraftTotals, type DraftLineItem } from '@/components/finance/BudgetLineItemEditor';
import { QuickAddCategoryRow } from '@/components/finance/QuickAddCategoryRow';
import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import { formatAmount } from '@/lib/finance/formatters';
import type { BudgetLineItem, ExpenseCategory, UpsertBudgetInput, UpsertBudgetLineItemInput } from '@/types/finance';

export interface EditBudgetSheetHandle {
  open: () => void;
}

interface EditBudgetSheetProps {
  year: number;
  categories: ExpenseCategory[];
  incomeTarget: number;
  lineItemsForCategory: (categoryId: string) => BudgetLineItem[];
  onSave: (rows: UpsertBudgetInput[]) => Promise<void>;
  onSaveLineItem: (input: UpsertBudgetLineItemInput) => Promise<void>;
  onDeleteLineItem: (id: string) => Promise<void>;
}

interface CategoryDraft {
  categoryId: string;
  annual: string;
}

let draftKeySeq = 0;
const nextDraftKey = () => `new-${Date.now()}-${draftKeySeq++}`;

export const EditBudgetSheet = forwardRef<EditBudgetSheetHandle, EditBudgetSheetProps>(
  function EditBudgetSheet(
    { year, categories, incomeTarget, lineItemsForCategory, onSave, onSaveLineItem, onDeleteLineItem },
    ref,
  ) {
    const sheetRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ['90%'], []);
    const [income, setIncome] = useState('');
    const [drafts, setDrafts] = useState<CategoryDraft[]>([]);
    const [extraCategories, setExtraCategories] = useState<ExpenseCategory[]>([]);
    const [itemDrafts, setItemDrafts] = useState<Record<string, DraftLineItem[]>>({});
    const [itemizedMode, setItemizedMode] = useState<Record<string, boolean>>({});
    const [deletedItemIds, setDeletedItemIds] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    const allCategories = useMemo(() => [...categories, ...extraCategories], [categories, extraCategories]);

    const reset = useCallback(() => {
      setIncome(incomeTarget > 0 ? String(incomeTarget) : '');
      setDrafts(categories.map((c) => ({ categoryId: c.id, annual: '' })));
      setExtraCategories([]);
      setDeletedItemIds([]);

      const itemMap: Record<string, DraftLineItem[]> = {};
      const modeMap: Record<string, boolean> = {};
      categories.forEach((c) => {
        const existing = lineItemsForCategory(c.id);
        itemMap[c.id] = existing.map((li) => ({
          key: li.id,
          id: li.id,
          name: li.name,
          amount: String(li.amount),
          month: li.month,
          sort_order: li.sort_order,
        }));
        modeMap[c.id] = existing.length > 0;
      });
      setItemDrafts(itemMap);
      setItemizedMode(modeMap);
    }, [categories, incomeTarget, lineItemsForCategory]);

    useImperativeHandle(ref, () => ({
      open: () => {
        reset();
        sheetRef.current?.present();
      },
    }));

    const setAnnual = (categoryId: string, value: string) => {
      setDrafts((prev) => prev.map((d) => (d.categoryId === categoryId ? { ...d, annual: value } : d)));
    };

    const toggleItemize = (categoryId: string) => {
      setItemizedMode((prev) => ({ ...prev, [categoryId]: !prev[categoryId] }));
    };

    const addItem = (categoryId: string) => {
      setItemDrafts((prev) => ({
        ...prev,
        [categoryId]: [
          ...(prev[categoryId] ?? []),
          { key: nextDraftKey(), name: '', amount: '', month: null, sort_order: prev[categoryId]?.length ?? 0 },
        ],
      }));
    };

    const removeItem = (categoryId: string, item: DraftLineItem) => {
      if (item.id) setDeletedItemIds((prev) => [...prev, item.id!]);
      setItemDrafts((prev) => ({
        ...prev,
        [categoryId]: (prev[categoryId] ?? []).filter((i) => i.key !== item.key),
      }));
    };

    const onCategoryCreated = (cat: ExpenseCategory) => {
      setExtraCategories((prev) => [...prev, cat]);
      setDrafts((prev) => [...prev, { categoryId: cat.id, annual: '' }]);
      setItemDrafts((prev) => ({ ...prev, [cat.id]: [] }));
    };

    const handleSave = async () => {
      setSaving(true);
      try {
        const rows: UpsertBudgetInput[] = [];
        const incomeAmt = Number(income);
        if (incomeAmt > 0) {
          rows.push({
            year,
            month: null,
            category_id: null,
            label: 'Total Revenue Target',
            budget_type: 'income',
            budgeted_amount: incomeAmt,
          });
        }

        for (const draft of drafts) {
          const items = itemDrafts[draft.categoryId] ?? [];
          if (items.length > 0) continue; // line items take priority — flat row left untouched

          const annual = Number(draft.annual);
          if (!annual || annual <= 0) continue;
          rows.push({ year, month: null, category_id: draft.categoryId, budget_type: 'expense', budgeted_amount: annual });
          const monthly = Math.round((annual / 12) * 100) / 100;
          for (let m = 1; m <= 12; m++) {
            rows.push({ year, month: m, category_id: draft.categoryId, budget_type: 'expense', budgeted_amount: monthly });
          }
        }

        for (const id of deletedItemIds) {
          await onDeleteLineItem(id);
        }
        for (const [categoryId, items] of Object.entries(itemDrafts)) {
          for (const item of items) {
            if (!item.name.trim()) continue;
            await onSaveLineItem({
              id: item.id,
              category_id: categoryId,
              year,
              month: item.month,
              name: item.name.trim(),
              amount: Number(item.amount) || 0,
              sort_order: item.sort_order,
            });
          }
        }

        await onSave(rows);
        sheetRef.current?.dismiss();
      } finally {
        setSaving(false);
      }
    };

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: '#1C1A0E' }}
      >
        <BottomSheetScrollView contentContainerStyle={{ padding: 24, paddingBottom: 48 }}>
          <Typography variant="subtitle" className="mb-1 text-gold">
            Edit {year} Budget
          </Typography>
          <Typography variant="caption" className="mb-4 text-subtle">
            Enter annual targets — monthly amounts are auto-divided into 12 equal months. Itemize a category to
            break it into named line items instead.
          </Typography>

          <Typography variant="caption" className="mb-2 text-silver">
            Total income target (annual)
          </Typography>
          <BottomSheetTextInput
            value={income}
            onChangeText={setIncome}
            keyboardType="numeric"
            placeholder="450000"
            placeholderTextColor="#9E9E9E"
            className="mb-4 rounded-xl border border-gold/20 bg-surface px-4 py-3 font-body text-base text-ink"
          />

          <Typography variant="label" className="mb-3 text-gold">
            Expense categories (annual)
          </Typography>
          {drafts.map((draft) => {
            const cat = allCategories.find((c) => c.id === draft.categoryId);
            if (!cat) return null;
            const items = itemDrafts[draft.categoryId] ?? [];
            const showEditor = itemizedMode[draft.categoryId] === true;

            return (
              <View key={draft.categoryId} className="mb-4">
                <View className="mb-1 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <View className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.colour }} />
                    <Typography variant="caption">{cat.name}</Typography>
                  </View>
                  <Pressable onPress={() => toggleItemize(draft.categoryId)}>
                    <Typography variant="caption" className="text-gold">
                      {showEditor ? 'Use total' : 'Itemize'}
                    </Typography>
                  </Pressable>
                </View>

                {showEditor ? (
                  <BudgetLineItemEditor
                    categoryId={draft.categoryId}
                    items={items}
                    onChange={(next) => setItemDrafts((prev) => ({ ...prev, [draft.categoryId]: next }))}
                    onRemove={(item) => removeItem(draft.categoryId, item)}
                    onAdd={() => addItem(draft.categoryId)}
                  />
                ) : items.length > 0 ? (
                  <View className="rounded-xl border border-gold/20 bg-surface px-4 py-3">
                    <Typography variant="caption" className="text-subtle">
                      Itemized · Annual {formatAmount(computeDraftTotals(items, draft.categoryId).annual)}
                    </Typography>
                  </View>
                ) : (
                  <BottomSheetTextInput
                    value={draft.annual}
                    onChangeText={(v) => setAnnual(draft.categoryId, v)}
                    keyboardType="numeric"
                    placeholder="Annual budget"
                    placeholderTextColor="#9E9E9E"
                    className="rounded-xl border border-gold/20 bg-surface px-4 py-3 font-body text-base text-ink"
                  />
                )}
              </View>
            );
          })}

          <QuickAddCategoryRow onCreated={onCategoryCreated} />

          <View className="mt-5">
            <Button label="Save budget" onPress={() => void handleSave()} loading={saving} fullWidth />
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);
