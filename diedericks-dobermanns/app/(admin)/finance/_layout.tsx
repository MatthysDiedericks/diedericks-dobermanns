import { Stack } from 'expo-router';

import { FinanceAccessDenied } from '@/components/finance/AccessDenied';
import { useFinanceAccess } from '@/hooks/useFinanceAccess';

export default function FinanceLayout() {
  const hasAccess = useFinanceAccess();

  if (!hasAccess) {
    return <FinanceAccessDenied />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0a0a08' },
      }}
    />
  );
}
