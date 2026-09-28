import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs, usePathname } from 'expo-router';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { ExpiringAlertsProvider, ExpiryBell } from '@/components/admin/ExpiryAlerts';
import { Colors } from '@/constants/colors';
import { tabBarTheme } from '@/constants/navTheme';
import { useUnallocatedSalesCount } from '@/hooks/useUnallocatedSales';
import { useAuthStore } from '@/stores/authStore';

export { ErrorBoundary } from '@/components/ui/RouteErrorBoundary';

function AccountantFinanceOnly() {
  const role = useAuthStore((s) => s.profile?.role);
  const pathname = usePathname();
  if (role !== 'accountant') return null;
  if (pathname?.includes('/finance')) return null;
  return <Redirect href="/(admin)/finance" />;
}

function AdminAlertBell() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  if (pathname?.includes('dashboard')) return null;
  return (
    <View style={{ position: 'absolute', top: insets.top + 8, right: 16, zIndex: 40 }}>
      <ExpiryBell />
    </View>
  );
}

export default function AdminLayout() {
  const { count: unallocatedCount } = useUnallocatedSalesCount();
  const accountant = useAuthStore((s) => s.profile?.role) === 'accountant';

  return (
    <AuthGuard roles={['admin', 'super_admin', 'management', 'accountant']}>
      <ExpiringAlertsProvider>
        <AccountantFinanceOnly />
        <View style={{ flex: 1 }}>
          <AdminAlertBell />
          <Tabs screenOptions={tabBarTheme}>
        <Tabs.Screen
          name="dashboard"
          options={{
            href: accountant ? null : undefined,
            title: 'Dashboard',
            tabBarIcon: ({ color, size }) => <Ionicons name="grid" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="dogs/index"
          options={{
            href: accountant ? null : undefined,
            title: 'Dogs',
            tabBarBadge: accountant ? undefined : unallocatedCount > 0 ? unallocatedCount : undefined,
            tabBarBadgeStyle: { backgroundColor: Colors.gold, color: Colors.black },
            tabBarIcon: ({ color, size }) => <Ionicons name="paw" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="breeding/index"
          options={{
            href: accountant ? null : undefined,
            title: 'Breeding',
            tabBarIcon: ({ color, size }) => <Ionicons name="heart-circle" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="litters/index"
          options={{
            href: accountant ? null : undefined,
            title: 'Litters',
            tabBarIcon: ({ color, size }) => <Ionicons name="git-branch" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="waiting-list"
          options={{
            href: accountant ? null : undefined,
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
        <Tabs.Screen name="finance/cashflow" options={{ href: null }} />
        <Tabs.Screen name="finance/proofs" options={{ href: null }} />
        <Tabs.Screen name="finance/purchases" options={{ href: null }} />

        {/* Hidden routes — reached via in-app navigation, not the tab bar. */}
        <Tabs.Screen name="dogs/new" options={{ href: null }} />
        <Tabs.Screen name="dogs/unallocated" options={{ href: null }} />
        <Tabs.Screen name="dogs/mine" options={{ href: null }} />
        <Tabs.Screen name="dogs/[id]/index" options={{ href: null }} />
        <Tabs.Screen name="dogs/[id]/edit" options={{ href: null }} />
        <Tabs.Screen name="dogs/[id]/pedigree" options={{ href: null }} />
        <Tabs.Screen name="dogs/[id]/story" options={{ href: null }} />
        <Tabs.Screen name="dogs/[id]/photos" options={{ href: null }} />
        <Tabs.Screen name="breeding-stock" options={{ href: null }} />
        <Tabs.Screen name="applications/index" options={{ href: null }} />
        <Tabs.Screen name="applications/[id]" options={{ href: null }} />
        <Tabs.Screen name="applications/merge" options={{ href: null }} />
        <Tabs.Screen name="applications/change-tier" options={{ href: null }} />
        <Tabs.Screen name="invite/index" options={{ href: null }} />
        <Tabs.Screen name="clients/index" options={{ href: null }} />
        <Tabs.Screen name="clients/[id]/index" options={{ href: null }} />
        <Tabs.Screen name="clients/[id]/view-as" options={{ href: null }} />
        <Tabs.Screen name="contacts/index" options={{ href: null }} />
        <Tabs.Screen name="contacts/[id]" options={{ href: null }} />
        <Tabs.Screen name="contacts/duplicates" options={{ href: null }} />
        <Tabs.Screen name="contacts/unreachable" options={{ href: null }} />
        <Tabs.Screen name="litters/new" options={{ href: null }} />
        <Tabs.Screen name="litters/[id]/register-pups" options={{ href: null }} />
        <Tabs.Screen name="litters/[id]/allocate" options={{ href: null }} />
        <Tabs.Screen name="litters/[id]/whelping" options={{ href: null }} />
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
        <Tabs.Screen name="breeding/plans/index" options={{ href: null }} />
        <Tabs.Screen name="breeding/plans/new" options={{ href: null }} />
        <Tabs.Screen name="breeding/plans/[id]/index" options={{ href: null }} />
        <Tabs.Screen name="breeding/plans/[id]/step" options={{ href: null }} />
        <Tabs.Screen name="health/index" options={{ href: null }} />
        <Tabs.Screen name="health/settings" options={{ href: null }} />
        <Tabs.Screen name="todos/index" options={{ href: null }} />
        <Tabs.Screen name="contracts/index" options={{ href: null }} />
        <Tabs.Screen name="contracts/[id]" options={{ href: null }} />
        <Tabs.Screen name="documents/index" options={{ href: null }} />
        <Tabs.Screen name="documents/unlabelled" options={{ href: null }} />
        <Tabs.Screen name="documents/pending" options={{ href: null }} />
        <Tabs.Screen name="media/pending" options={{ href: null }} />
        <Tabs.Screen name="quotes/index" options={{ href: null }} />
        <Tabs.Screen name="quotes/new" options={{ href: null }} />
        <Tabs.Screen name="quotes/[id]" options={{ href: null }} />
        <Tabs.Screen name="quotes/[id]/edit" options={{ href: null }} />
        <Tabs.Screen name="training/journey/[dogId]" options={{ href: null }} />
        <Tabs.Screen name="follow-ups/health" options={{ href: null }} />
        <Tabs.Screen name="marketing" options={{ href: null }} />
        <Tabs.Screen name="client-groups/index" options={{ href: null }} />
        <Tabs.Screen name="client-groups/[id]" options={{ href: null }} />
        <Tabs.Screen name="broadcast/new" options={{ href: null }} />
        <Tabs.Screen name="messaging/index" options={{ href: null }} />
        <Tabs.Screen name="settings/index" options={{ href: null }} />
        <Tabs.Screen name="settings/social" options={{ href: null }} />
        <Tabs.Screen name="settings/pricing" options={{ href: null }} />
        <Tabs.Screen name="settings/catalogue" options={{ href: null }} />
        <Tabs.Screen name="settings/skill-library" options={{ href: null }} />
        <Tabs.Screen name="settings/quote-lapse" options={{ href: null }} />
        <Tabs.Screen name="settings/alerts" options={{ href: null }} />
        <Tabs.Screen name="settings/allocation" options={{ href: null }} />
        <Tabs.Screen name="training/index" options={{ href: null }} />
        <Tabs.Screen name="enquiries" options={{ href: null }} />
        <Tabs.Screen name="equipment/index" options={{ href: null }} />
        <Tabs.Screen name="equipment/[id]" options={{ href: null }} />
        <Tabs.Screen name="stock" options={{ href: null }} />
        <Tabs.Screen name="stock/receive" options={{ href: null }} />
        <Tabs.Screen name="stock/new" options={{ href: null }} />
        <Tabs.Screen name="stock/[id]" options={{ href: null }} />
        <Tabs.Screen name="gallery" options={{ href: null }} />
        <Tabs.Screen name="testimonials" options={{ href: null }} />
        <Tabs.Screen name="faq" options={{ href: null }} />
        <Tabs.Screen name="analytics" options={{ href: null }} />
        <Tabs.Screen name="audit" options={{ href: null }} />
        <Tabs.Screen name="security" options={{ href: null }} />
        <Tabs.Screen name="errors" options={{ href: null }} />
        <Tabs.Screen name="notifications" options={{ href: null }} />
        <Tabs.Screen name="waitlist/index" options={{ href: null }} />
        <Tabs.Screen name="waitlist/new" options={{ href: null }} />
        <Tabs.Screen name="waitlist/[id]" options={{ href: null }} />
        <Tabs.Screen name="waitlist/match" options={{ href: null }} />
        <Tabs.Screen name="waitlist/follow-ups" options={{ href: null }} />
        <Tabs.Screen name="follow-ups" options={{ href: null }} />
        <Tabs.Screen name="pedigree/ancestor-photos" options={{ href: null }} />
          </Tabs>
        </View>
      </ExpiringAlertsProvider>
    </AuthGuard>
  );
}
