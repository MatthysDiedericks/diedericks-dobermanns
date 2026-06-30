import {
  BottomSheetModal,
  BottomSheetScrollView,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Typography } from '@/components/ui/Typography';
import type { ExpenseCategory, UpsertBudgetInput } from '@/types/finance';

export interface EditBudgetSheetHandle {
  open: () => void;
}

interface EditBudgetSheetProps {
  year: number;
  categories: ExpenseCategory[];
  incomeTarget: number;
  onSave: (rows: UpsertBudgetInput[]) => Promise<void>;
}

interface CategoryDraft {
  categoryId: string;
  annual: string;
}

export const EditBudgetSheet = forwardRef<EditBudgetSheetHandle, EditBudgetSheetProps>(
  function EditBudgetSheet({ year, categories, incomeTarget, onSave }, ref) {
    const sheetRef = useRef<BottomSheetModal>(null);
    const snapPoints = useMemo(() => ['90%'], []);
    const [income, setIncome] = useState('');
    const [drafts, setDrafts] = useState<CategoryDraft[]>([]);
    const [saving, setSaving] = useState(false);

    const reset = useCallback(() => {
      setIncome(incomeTarget > 0 ? String(incomeTarget) : '');
      setDrafts(categories.map((c) => ({ categoryId: c.id, annual: '' })));
    }, [categories, incomeTarget]);

    useImperativeHandle(ref, () => ({
      open: () => {
        reset();
        sheetRef.current?.present();
      },
    }));

    const setAnnual = (categoryId: string, value: string) => {
      setDrafts((prev) => prev.map((d) => (d.categoryId === categoryId ? { ...d, annual: value } : d)));
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
          const annual = Number(draft.annual);
          if (!annual || annual <= 0) continue;
          rows.push({
            year,
            month: null,
            category_id: draft.categoryId,
            budget_type: 'expense',
            budgeted_amount: annual,
          });
          const monthly = Math.round((annual / 12) * 100) / 100;
          for (let m = 1; m <= 12; m++) {
            rows.push({
              year,
              month: m,
              category_id: draft.categoryId,
              budget_type: 'expense',
              budgeted_amount: monthly,
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
            Enter annual targets — monthly amounts are auto-divided into 12 equal months.
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
            const cat = categories.find((c) => c.id === draft.categoryId);
            if (!cat) return null;
            return (
              <View key={draft.categoryId} className="mb-3">
                <View className="mb-1 flex-row items-center gap-2">
                  <View className="h-2 w-2 rounded-full" style={{ backgroundColor: cat.colour }} />
                  <Typography variant="caption">{cat.name}</Typography>
                </View>
                <BottomSheetTextInput
                  value={draft.annual}
                  onChangeText={(v) => setAnnual(draft.categoryId, v)}
                  keyboardType="numeric"
                  placeholder="Annual budget"
                  placeholderTextColor="#9E9E9E"
                  className="rounded-xl border border-gold/20 bg-surface px-4 py-3 font-body text-base text-ink"
                />
              </View>
            );
          })}

          <Button label="Save budget" onPress={() => void handleSave()} loading={saving} fullWidth />
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);
