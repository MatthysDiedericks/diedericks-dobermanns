import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useRecurringExpenses } from '@/hooks/useRecurringExpenses';
import { formatNextDue, monthlyEquivalent } from '@/lib/finance/recurringUtils';
import { formatAmount } from '@/lib/finance/formatters';

const SECTIONS: { key: string; label: string }[] = [
  { key: 'monthly', label: 'MONTHLY' },
  { key: 'quarterly', label: 'QUARTERLY' },
  { key: 'annual', label: 'ANNUAL' },
  { key: 'other', label: 'OTHER' },
];

export default function RecurringExpensesScreen() {
  const router = useRouter();
  const { grouped, totals, loading, error, refresh, removeRecurring } = useRecurringExpenses();

  const confirmRemove = (id: string, name: string) => {
    Alert.alert('Remove recurring?', `Stop recurring schedule for "${name}"? The expense record is kept.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => void removeRecurring(id) },
    ]);
  };

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Finance" title="Recurring Expenses" />

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
          <View className="mb-6 flex-row gap-4 rounded-xl border border-gold/25 bg-gold/10 p-3">
            <View>
              <Typography variant="caption" className="text-subtle">
                Monthly cost
              </Typography>
              <Typography variant="label" className="text-gold">
                {formatAmount(totals.monthly)}
              </Typography>
            </View>
            <View>
              <Typography variant="caption" className="text-subtle">
                Annualised
              </Typography>
              <Typography variant="label" className="text-gold">
                {formatAmount(totals.annual)}
              </Typography>
            </View>
          </View>

          {SECTIONS.map(({ key, label }) => {
            const items = grouped[key] ?? [];
            if (items.length === 0) return null;
            return (
              <View key={key} className="mb-4">
                <Typography variant="label" className="mb-3 text-gold">
                  {label} ({items.length})
                </Typography>
                {items.map((exp) => (
                  <Card key={exp.id} className="mb-3 border border-gold/20 bg-black-rich">
                    <View className="mb-1 flex-row items-center gap-2">
                      <View className="h-2 w-2 rounded-full" style={{ backgroundColor: exp.categoryColour }} />
                      <Typography variant="body" className="flex-1" numberOfLines={1}>
                        {exp.description}
                      </Typography>
                    </View>
                    <Typography variant="label" className="mb-1 text-gold">
                      {formatAmount(exp.amount)} / {exp.recurrence_interval ?? 'period'}
                      {' · '}
                      {formatAmount(monthlyEquivalent(Number(exp.amount), exp.recurrence_interval))}/mo eq.
                    </Typography>
                    {exp.supplier_name ? (
                      <Typography variant="caption" className="text-subtle">
                        {exp.supplier_name}
                      </Typography>
                    ) : null}
                    <Typography variant="caption" className="mb-3 text-subtle">
                      Next due: {formatNextDue(exp.expense_date, exp.recurrence_interval)}
                    </Typography>
                    <View className="flex-row gap-2">
                      <Button
                        label="Edit"
                        size="sm"
                        variant="outline"
                        onPress={() =>
                          router.push({
                            pathname: '/(admin)/finance/expenses/new',
                            params: { expenseId: exp.id },
                          } as never)
                        }
                      />
                      <Button
                        label="Remove"
                        size="sm"
                        variant="ghost"
                        onPress={() => confirmRemove(exp.id, exp.description)}
                      />
                    </View>
                  </Card>
                ))}
              </View>
            );
          })}

          <Button
            label="+ Add Recurring Expense"
            fullWidth
            onPress={() =>
              router.push({
                pathname: '/(admin)/finance/expenses/new',
                params: { isRecurring: 'true' },
              } as never)
            }
          />
        </ScrollView>
      )}
    </ScreenContainer>
  );
}
