import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useExpensesByDog } from '@/hooks/useExpenses';
import { formatAmount, formatDate } from '@/lib/finance/formatters';
import type { Dog } from '@/types/app.types';

export function DogExpensesTab({ dogId, dog }: { dogId: string; dog: Dog }) {
  const router = useRouter();
  const { data, totalAmount, loading, refresh } = useExpensesByDog(dogId);

  if (loading) {
    return <ActivityIndicator color={Colors.gold} className="mt-8" />;
  }

  return (
    <View className="pb-8">
      <Card className="mb-4 border-gold/30">
        <Typography variant="caption" className="text-silver">
          Total spent on this dog
        </Typography>
        <Typography variant="display" className="text-gold">
          {formatAmount(totalAmount)}
        </Typography>
      </Card>

      <Button
        label="+ Log expense for this dog"
        variant="outline"
        size="sm"
        className="mb-4"
        onPress={() =>
          router.push({
            pathname: '/(admin)/finance/expenses/new',
            params: { dogId, dogName: dog.call_name?.trim() || dog.name },
          } as never)
        }
      />

      {data.length === 0 ? (
        <Typography variant="body" className="text-silver">
          No expenses logged for this dog yet.
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

      <Pressable onPress={() => void refresh()} className="mt-2">
        <Typography variant="caption" className="text-gold">
          Refresh
        </Typography>
      </Pressable>
    </View>
  );
}
