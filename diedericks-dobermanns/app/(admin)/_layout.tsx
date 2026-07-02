import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { tabBarTheme } from '@/constants/navTheme';

export { ErrorBoundary } from '@/components/ui/RouteErrorBoundary';

export default function AdminLayout() {
  return (
    <AuthGuard roles={['admin', 'super_admin', 'management']}>
      <Tabs screenOptions={tabBarTheme}>
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color, size }) => <Ionicons name="grid" color={color} size={size} />,
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
          name="breeding/index"
          options={{
            title: 'Breeding',
            tabBarIcon: ({ color, size }) => <Ionicons name="heart-circle" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="litters/index"
          options={{
            title: 'Litters',
            tabBarIcon: ({ color, size }) => <Ionicons name="git-branch" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="waiting-list"
          options={{
            title: 'Waitlist',
            tabBarIcon: ({ color, size }) => <Ionicons name="list" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="finance/index"
          options={{
            title: 'Finance',
            tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" color={color} size={size} />,
          }}
        />

        {/* Hidden routes — reached via in-app navigation, not the tab bar. */}
        <Tabs.Screen name="dogs/new" options={{ href: null }} />
        <Tabs.Screen name="dogs/[id]/index" options={{ href: null }} />
        <Tabs.Screen name="dogs/[id]/edit" options={{ href: null }} />
        <Tabs.Screen name="dogs/[id]/pedigree" options={{ href: null }} />
        <Tabs.Screen name="dogs/[id]/story" options={{ href: null }} />
        <Tabs.Screen name="dogs/[id]/photos" options={{ href: null }} />
        <Tabs.Screen name="breeding-stock" options={{ href: null }} />
        <Tabs.Screen name="applications/index" options={{ href: null }} />
        <Tabs.Screen name="applications/[id]" options={{ href: null }} />
        <Tabs.Screen name="clients/index" options={{ href: null }} />
        <Tabs.Screen name="clients/[id]" options={{ href: null }} />
        <Tabs.Screen name="litters/new" options={{ href: null }} />
        <Tabs.Screen name="litters/[id]/register-pups" options={{ href: null }} />
        <Tabs.Screen name="dogs/[id]/litter-history" options={{ href: null }} />
        <Tabs.Screen name="litters/[id]/index" options={{ href: null }} />
        <Tabs.Screen name="litters/[id]/edit" options={{ href: null }} />
        <Tabs.Screen name="heats/index" options={{ href: null }} />
        <Tabs.Screen name="heats/[dogId]/index" options={{ href: null }} />
        <Tabs.Screen name="heats/reference" options={{ href: null }} />
        <Tabs.Screen name="breeding/pairing-builder" options={{ href: null }} />
        <Tabs.Screen name="breeding/litter-recorder" options={{ href: null }} />
        <Tabs.Screen name="breeding/organogram" options={{ href: null }} />
        <Tabs.Screen name="breeding/planner" options={{ href: null }} />
        <Tabs.Screen name="breeding/trial-planner" options={{ href: null }} />
        <Tabs.Screen name="health/index" options={{ href: null }} />
        <Tabs.Screen name="health/settings" options={{ href: null }} />
        <Tabs.Screen name="todos/index" options={{ href: null }} />
        <Tabs.Screen name="contracts/index" options={{ href: null }} />
        <Tabs.Screen name="documents/index" options={{ href: null }} />
        <Tabs.Screen name="quotes/index" options={{ href: null }} />
        <Tabs.Screen name="quotes/new" options={{ href: null }} />
        <Tabs.Screen name="quotes/[id]" options={{ href: null }} />
        <Tabs.Screen name="invoices/index" options={{ href: null }} />
        <Tabs.Screen name="invoices/[id]" options={{ href: null }} />
        <Tabs.Screen name="marketing" options={{ href: null }} />
        <Tabs.Screen name="client-groups/index" options={{ href: null }} />
        <Tabs.Screen name="client-groups/[id]" options={{ href: null }} />
        <Tabs.Screen name="broadcast/new" options={{ href: null }} />
        <Tabs.Screen name="messaging/index" options={{ href: null }} />
        <Tabs.Screen name="settings/index" options={{ href: null }} />
        <Tabs.Screen name="settings/social" options={{ href: null }} />
        <Tabs.Screen name="training/index" options={{ href: null }} />
        <Tabs.Screen name="enquiries" options={{ href: null }} />
        <Tabs.Screen name="gallery" options={{ href: null }} />
        <Tabs.Screen name="testimonials" options={{ href: null }} />
        <Tabs.Screen name="faq" options={{ href: null }} />
        <Tabs.Screen name="analytics" options={{ href: null }} />
        <Tabs.Screen name="notifications" options={{ href: null }} />
        <Tabs.Screen name="waitlist/index" options={{ href: null }} />
        <Tabs.Screen name="waitlist/new" options={{ href: null }} />
        <Tabs.Screen name="waitlist/[id]" options={{ href: null }} />
        <Tabs.Screen name="waitlist/match" options={{ href: null }} />
        <Tabs.Screen name="waitlist/follow-ups" options={{ href: null }} />
      </Tabs>
    </AuthGuard>
  );
}
