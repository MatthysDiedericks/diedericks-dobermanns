import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { BudgetCategoryRow } from '@/components/finance/BudgetCategoryRow';
import { EditBudgetSheet, type EditBudgetSheetHandle } from '@/components/finance/EditBudgetSheet';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useBudgets } from '@/hooks/useBudgets';
import { useBudgetSummary } from '@/hooks/useBudgetSummary';
import { progressBarColor, sumBudgetAmount } from '@/lib/finance/budgetQueries';
import { formatAmount } from '@/lib/finance/formatters';
import { financeYearRange } from '@/lib/finance/years';

const MONTHS = ['Annual', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function BudgetScreen() {
  const sheetRef = useRef<EditBudgetSheetHandle>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [viewIdx, setViewIdx] = useState(0);
  const month = viewIdx === 0 ? null : viewIdx;

  const {
    categories,
    budgets,
    loading,
    error,
    refresh,
    saveMany,
    saveLineItem,
    deleteLineItem,
    lineItemsForCategory,
    budgetForCategoryMonth,
    actualForCategory,
  } = useBudgets(year);
  const { summary } = useBudgetSummary(year);

  const incomeTarget = sumBudgetAmount(budgets, 'income');
  const expenseBudget = sumBudgetAmount(budgets, 'expense');
  const netTarget = incomeTarget - expenseBudget;
  const incomeActual = summary?.totalIncomeActual ?? 0;
  const incomePct = incomeTarget > 0 ? (incomeActual / incomeTarget) * 100 : 0;
  const incomeColors = progressBarColor(incomePct);

  const rows = useMemo(
    () =>
      categories.map((category) => ({
        category,
        budgeted: budgetForCategoryMonth(category.id, month),
        actual: actualForCategory(category.id, month),
        items: lineItemsForCategory(category.id),
      })),
    [categories, month, budgetForCategoryMonth, actualForCategory, lineItemsForCategory],
  );

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Finance" title="Budget" />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3 px-6">
        {financeYearRange().map((y) => (
          <Pressable
            key={y}
            onPress={() => setYear(y)}
            className={`mr-2 rounded-full border px-4 py-2 ${
              y === year ? 'border-gold bg-gold/15' : 'border-gold/30'
            }`}
          >
            <Typography variant="label">{y}</Typography>
          </Pressable>
        ))}
      </ScrollView>

      <View className="mb-4 flex-row items-center justify-between px-6">
        <Typography variant="caption" className="text-subtle">
          {year} · {month == null ? 'Annual view' : MONTHS[viewIdx]}
        </Typography>
        <Button label="Edit Budget" size="sm" variant="outline" onPress={() => sheetRef.current?.open()} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 px-6">
        {MONTHS.map((m, idx) => (
          <Pressable
            key={m}
            onPress={() => setViewIdx(idx)}
            className={`mr-2 rounded-full border px-3 py-1.5 ${
              idx === viewIdx ? 'border-gold bg-gold/15' : 'border-gold/30'
            }`}
          >
            <Typography variant="caption">{m}</Typography>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <View className="px-6">
          <CardListSkeleton count={3} />
        </View>
      ) : error ? (
        <View className="px-6">
          <Typography variant="body" className="mb-3 text-danger">
            {error}
          </Typography>
          <Button label="Retry" size="sm" variant="outline" onPress={() => void refresh()} />
        </View>
      ) : (
        <ScrollView className="px-6 pb-12" showsVerticalScrollIndicator={false}>
          <Typography variant="label" className="mb-3 text-gold">
            ANNUAL TARGETS
          </Typography>
          <View className="mb-4 rounded-xl border border-gold/20 bg-black-rich p-3">
            <View className="flex-row justify-between py-1">
              <Typography variant="body">Total income target</Typography>
              <Typography variant="label" className="text-gold">
                {formatAmount(incomeTarget)}
              </Typography>
            </View>
            <View className="flex-row justify-between py-1">
              <Typography variant="body">Total expense budget</Typography>
              <Typography variant="label" className="text-gold">
                {formatAmount(expenseBudget)}
              </Typography>
            </View>
            <View className="flex-row justify-between border-t border-gold/20 pt-2">
              <Typography variant="subtitle">Target net profit</Typography>
              <Typography variant="label" className={netTarget >= 0 ? 'text-gold' : 'text-danger'}>
                {formatAmount(netTarget)}
              </Typography>
            </View>
          </View>

          <Typography variant="label" className="mb-3 text-gold">
            EXPENSES BY CATEGORY
          </Typography>
          {rows.map(({ category, budgeted, actual, items }) => (
            <BudgetCategoryRow
              key={category.id}
              name={category.name}
              colour={category.colour}
              budgeted={budgeted}
              actual={actual}
              items={items}
              month={month}
            />
          ))}

          <Typography variant="label" className="mb-3 mt-2 text-gold">
            INCOME TRACKER
          </Typography>
          <View className="mb-6 rounded-xl border border-gold/20 bg-black-rich p-3">
            <Typography variant="caption" className="text-subtle">
              Target: {formatAmount(incomeTarget)} · Actual: {formatAmount(incomeActual)}
            </Typography>
            <View className="mt-2 h-2 overflow-hidden rounded-full bg-surface">
              <View
                className={`h-2 rounded-full ${incomeColors.bar}`}
                style={{ width: `${Math.min(incomePct, 100)}%` }}
              />
            </View>
            <Typography variant="caption" className={`mt-1 ${incomeColors.text}`}>
              {incomeTarget > 0 ? `${incomePct.toFixed(1)}% of target` : 'Set an income target in Edit Budget'}
            </Typography>
          </View>
        </ScrollView>
      )}

      <EditBudgetSheet
        ref={sheetRef}
        year={year}
        categories={categories}
        incomeTarget={incomeTarget}
        lineItemsForCategory={lineItemsForCategory}
        onSave={saveMany}
        onSaveLineItem={saveLineItem}
        onDeleteLineItem={deleteLineItem}
      />
    </ScreenContainer>
  );
}
