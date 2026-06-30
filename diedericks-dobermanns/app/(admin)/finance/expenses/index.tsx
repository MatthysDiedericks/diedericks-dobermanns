import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { deleteExpense, useExpenseCategories, useExpenses } from '@/hooks/useExpenses';
import { formatAmount, formatDate } from '@/lib/finance/formatters';

export default function FinanceExpensesListScreen() {
  const router = useRouter();
  const [categoryFilter, setCategoryFilter] = useState('all');
  const { categories } = useExpenseCategories();
  const { data: expenses, loading, refresh } = useExpenses(
    categoryFilter === 'all' ? undefined : categoryFilter,
  );

  const total = useMemo(
    () => expenses.reduce((s, e) => s + Number(e.amount), 0),
    [expenses],
  );

  const handleDelete = async (id: string) => {
    await deleteExpense(id);
    refresh();
  };

  return (
    <ScreenContainer>
      <PageHeader
        eyebrow="Finance"
        title="Expenses"
        back={false}
      />

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

      {loading ? <CardListSkeleton count={5} /> : null}

      <View className="gap-3 px-6 pb-24">
        {!loading && expenses.length === 0 ? (
          <EmptyState title="No expenses" message="Log your first expense to track costs." />
        ) : null}
        {expenses.map((exp) => (
          <Card key={exp.id} className="flex-row items-center justify-between">
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
                {formatAmount(exp.amount)}
              </Typography>
              {exp.is_recurring ? (
                <Typography variant="caption">Recurring</Typography>
              ) : null}
              <Pressable onPress={() => handleDelete(exp.id)}>
                <Typography variant="caption" className="text-danger">Delete</Typography>
              </Pressable>
            </View>
          </Card>
        ))}
      </View>

      <Pressable
        onPress={() => router.push('/(admin)/finance/expenses/new')}
        className="absolute bottom-6 right-6 rounded-full border border-gold bg-gold px-6 py-3"
      >
        <Typography variant="label" className="text-black-rich">+ Log expense</Typography>
      </Pressable>
    </ScreenContainer>
  );
}
