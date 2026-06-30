import { useLocalSearchParams } from 'expo-router';

import { ExpenseLogForm } from '@/components/finance/ExpenseLogForm';
import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenContainer } from '@/components/ui/ScreenContainer';

export default function NewExpenseScreen() {
  const params = useLocalSearchParams<{ expenseId?: string }>();
  const editingId = typeof params.expenseId === 'string' ? params.expenseId : undefined;

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Finance" title={editingId ? 'Edit expense' : 'Log expense'} />
      <ExpenseLogForm />
    </ScreenContainer>
  );
}
