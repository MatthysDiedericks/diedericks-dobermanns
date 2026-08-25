import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { deleteExpense, useExpenseCategories, useExpenses } from '@/hooks/useExpenses';
import {
  deleteExpenseConfirmText,
  expenseGross,
  expenseVatNote,
  isImportedExpenseSource,
} from '@/lib/finance/expenseGross';
import { formatAmount, formatDate } from '@/lib/finance/formatters';
import { showSaved } from '@/lib/dogDetail/feedback';
import type { ExpenseWithCategory } from '@/types/finance';

export default function FinanceExpensesListScreen() {
  const router = useRouter();
  const [categoryFilter, setCategoryFilter] = useState('all');
  const { categories } = useExpenseCategories();
  const { data: expenses, loading, refresh } = useExpenses(
    categoryFilter === 'all' ? undefined : categoryFilter,
  );

  const total = useMemo(
    () => expenses.reduce((s, e) => s + expenseGross(e), 0),
    [expenses],
  );

  const confirmDelete = (exp: ExpenseWithCategory) => {
    const gross = expenseGross(exp);
    const label = deleteExpenseConfirmText(exp.description, gross);
    const imported = isImportedExpenseSource(exp.source);
    const run = (alsoFuture: boolean) => {
      void deleteExpense(exp.id, { alsoFuture })
        .then(() => {
          showSaved('Deleted');
          refresh();
        })
        .catch((e) => Alert.alert('Error', e instanceof Error ? e.message : 'Could not delete'));
    };

    if (exp.is_recurring) {
      Alert.alert(
        'Recurring expense',
        `${label} Deleting also stops future projected entries.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'This one only', style: 'destructive', onPress: () => run(false) },
          { text: 'This and all future', style: 'destructive', onPress: () => run(true) },
        ],
      );
      return;
    }
    if (imported) {
      Alert.alert(
        'Imported expense',
        `${label} This was imported and will reappear on the next import.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete anyway', style: 'destructive', onPress: () => run(false) },
        ],
      );
      return;
    }
    Alert.alert('Delete expense?', label, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => run(false) },
    ]);
  };

  return (
    <ScreenContainer scroll={false}>
      <PageHeader eyebrow="Finance" title="Expenses" back={false} />

      <View className="mb-4 px-6">
        <Typography variant="display" className="text-gold">{formatAmount(total)}</Typography>
        <Typography variant="caption">{expenses.length} expenses</Typography>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4 px-6">
        <Pressable
          onPress={() => setCategoryFilter('all')}
          className={`mr-2 rounded-full border px-3 py-1.5 ${
            categoryFilter === 'all' ? 'border-gold bg-gold/15' : 'border-gold/30'
          }`}
        >
          <Typography variant="caption">All</Typography>
        </Pressable>
        {categories.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => setCategoryFilter(c.id)}
            className={`mr-2 rounded-full border px-3 py-1.5 ${
              categoryFilter === c.id ? 'border-gold bg-gold/15' : 'border-gold/30'
            }`}
          >
            <Typography variant="caption">{c.name}</Typography>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <View className="px-6">
          <CardListSkeleton count={5} />
        </View>
      ) : expenses.length === 0 ? (
        <View className="px-6">
          <EmptyState title="No expenses" message="Log your first expense to track costs." />
        </View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => item.id}
          contentContainerClassName="gap-3 px-6 pb-24"
          initialNumToRender={12}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={Colors.gold} />}
          renderItem={({ item: exp }) => {
            const vat = expenseVatNote(exp.vat_amount);
            return (
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: '/(admin)/finance/expenses/new',
                    params: { expenseId: exp.id },
                  })
                }
              >
                <Card className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3 flex-1">
                    <View
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: exp.categoryColour }}
                    />
                    <View className="flex-1">
                      <Typography variant="body" numberOfLines={1}>{exp.description}</Typography>
                      <Typography variant="caption">
                        {exp.categoryName} · {formatDate(exp.expense_date)}
                      </Typography>
                    </View>
                  </View>
                  <View className="items-end">
                    <Typography variant="label" className="text-gold">
                      {formatAmount(expenseGross(exp))}
                    </Typography>
                    {vat ? (
                      <Typography variant="caption" className="text-subtle">{vat}</Typography>
                    ) : null}
                    {exp.is_recurring ? (
                      <Typography variant="caption">Recurring</Typography>
                    ) : null}
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation?.();
                        confirmDelete(exp);
                      }}
                    >
                      <Typography variant="caption" className="text-danger">Delete</Typography>
                    </Pressable>
                  </View>
                </Card>
              </Pressable>
            );
          }}
        />
      )}

      <Pressable
        onPress={() => router.push('/(admin)/finance/expenses/new')}
        className="absolute bottom-6 right-6 rounded-full border border-gold bg-gold px-6 py-3"
      >
        <Typography variant="label" className="text-black-rich">+ Log expense</Typography>
      </Pressable>
    </ScreenContainer>
  );
}
