import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { tabBarTheme } from '@/constants/navTheme';
import { isAdminPlus } from '@/lib/auth/routes';
import { useAuthStore } from '@/stores/authStore';

export { ErrorBoundary } from '@/components/ui/RouteErrorBoundary';

export default function TabsLayout() {
  const role = useAuthStore((s) => s.profile?.role);
  const adminPlus = isAdminPlus(role);

  return (
    <AuthGuard roles={['management', 'admin', 'super_admin']}>
      <Tabs screenOptions={tabBarTheme}>
        <Tabs.Screen
          name="dashboard/index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="dogs/index"
          options={{
            title: 'Dogs',
            tabBarIcon: ({ color, size }) => <Ionicons name="paw" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="health/index"
          options={{
            title: 'Health',
            tabBarIcon: ({ color, size }) => <Ionicons name="heart" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="calendar/index"
          options={{
            title: 'Calendar',
            tabBarIcon: ({ color, size }) => <Ionicons name="calendar" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="contacts/index"
          options={{
            title: 'Contacts',
            href: adminPlus ? undefined : null,
            tabBarIcon: ({ color, size }) => <Ionicons name="people" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="finance/index"
          options={{
            title: 'Finance',
            href: adminPlus ? undefined : null,
            tabBarIcon: ({ color, size }) => <Ionicons name="cash" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="documents/index"
          options={{
            title: 'Docs',
            href: adminPlus ? undefined : null,
            tabBarIcon: ({ color, size }) => <Ionicons name="folder" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="settings/index"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => <Ionicons name="settings" color={color} size={size} />,
          }}
        />

        {/* Hidden stack routes */}
        <Tabs.Screen name="dogs/[id]" options={{ href: null }} />
        <Tabs.Screen name="dogs/litters/index" options={{ href: null }} />
        <Tabs.Screen name="dogs/litters/[id]" options={{ href: null }} />
        <Tabs.Screen name="contacts/[id]" options={{ href: null }} />
        <Tabs.Screen name="contacts/enquiries/[id]" options={{ href: null }} />
        <Tabs.Screen name="health/vaccinations/index" options={{ href: null }} />
        <Tabs.Screen name="health/vaccinations/[id]" options={{ href: null }} />
        <Tabs.Screen name="health/deworming/index" options={{ href: null }} />
        <Tabs.Screen name="health/vet-visits/index" options={{ href: null }} />
        <Tabs.Screen name="health/vet-visits/[id]" options={{ href: null }} />
        <Tabs.Screen name="genetics/index" options={{ href: null }} />
      </Tabs>
    </AuthGuard>
  );
}
