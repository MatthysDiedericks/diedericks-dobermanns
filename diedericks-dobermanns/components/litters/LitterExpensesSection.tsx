import { useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useExpensesByLitter } from '@/hooks/useExpenses';
import { formatAmount, formatDate } from '@/lib/finance/formatters';

interface Props {
  litterId: string;
  litterName: string;
}

export function LitterExpensesSection({ litterId, litterName }: Props) {
  const router = useRouter();
  const { data, totalAmount, loading } = useExpensesByLitter(litterId);

  if (loading) {
    return <ActivityIndicator color={Colors.gold} className="my-4" />;
  }

  return (
    <View className="mb-8">
      <View className="mb-3 flex-row items-center justify-between">
        <Typography variant="label" className="text-gold">
          Litter expenses
        </Typography>
        <Typography variant="label">Total: {formatAmount(totalAmount)}</Typography>
      </View>

      <Button
        label="+ Log expense for this litter"
        variant="outline"
        size="sm"
        className="mb-4"
        onPress={() =>
          router.push({
            pathname: '/(admin)/finance/expenses/new',
            params: { litterId, litterName },
          } as never)
        }
      />

      {data.length === 0 ? (
        <Typography variant="body" className="text-silver">
          No expenses logged for this litter yet.
        </Typography>
      ) : (
        data.map((exp) => (
          <Card key={exp.id} className="mb-3">
            <View className="mb-1 flex-row items-center gap-2">
              <View className="h-2 w-2 rounded-full" style={{ backgroundColor: exp.categoryColour }} />
              <Typography variant="label">{exp.categoryName}</Typography>
            </View>
            <Typography variant="body">{exp.description}</Typography>
            <Typography variant="label" className="mt-1 text-gold">
              {formatAmount(exp.amount)}
            </Typography>
            <Typography variant="caption" className="text-silver">
              {formatDate(exp.expense_date)}
              {exp.supplier_name ? ` · ${exp.supplier_name}` : ''}
            </Typography>
          </Card>
        ))
      )}
    </View>
  );
}
