import { Stack } from 'expo-router';

import { Colors } from '@/constants/colors';

export { ErrorBoundary } from '@/components/ui/RouteErrorBoundary';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.black },
      }}
    />
  );
}
