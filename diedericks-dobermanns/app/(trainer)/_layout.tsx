import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { tabBarTheme } from '@/constants/navTheme';

export { ErrorBoundary } from '@/components/ui/RouteErrorBoundary';

export default function TrainerLayout() {
  return (
    <AuthGuard roles={['trainer']}>
      <Tabs screenOptions={tabBarTheme}>
        <Tabs.Screen
          name="bookings/index"
          options={{
            title: 'My Sessions',
            tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="dogs/index"
          options={{
            title: 'My Dogs',
            tabBarIcon: ({ color, size }) => <Ionicons name="paw" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="profile/index"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
          }}
        />
        <Tabs.Screen name="bookings/[id]" options={{ href: null }} />
        <Tabs.Screen name="dogs/[dogId]" options={{ href: null }} />
      </Tabs>
    </AuthGuard>
  );
}
