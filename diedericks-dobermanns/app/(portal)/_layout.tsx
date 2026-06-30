import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { View } from 'react-native';

import { AuthGuard } from '@/components/auth/AuthGuard';
import { WhatsAppFab } from '@/components/social/WhatsAppFab';
import { Colors } from '@/constants/colors';
import { tabBarTheme } from '@/constants/navTheme';
import { useClientMessages } from '@/hooks/useMessages';
import { useNotifications } from '@/hooks/useNotifications';

export { ErrorBoundary } from '@/components/ui/RouteErrorBoundary';

export default function PortalLayout() {
  // Loads the client's inbox + drives the unread badge while in the portal.
  const { unreadCount } = useNotifications();
  const { unreadCount: unreadMessages } = useClientMessages();

  return (
    <AuthGuard>
      <View style={{ flex: 1 }}>
      <Tabs screenOptions={tabBarTheme}>
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => <Ionicons name="grid" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="reservation"
          options={{
            title: 'Reservation',
            tabBarIcon: ({ color, size }) => <Ionicons name="bookmark" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="messages"
          options={{
            title: 'Messages',
            tabBarBadge: unreadMessages > 0 ? unreadMessages : undefined,
            tabBarBadgeStyle: { backgroundColor: Colors.gold, color: Colors.black },
            tabBarIcon: ({ color, size }) => <Ionicons name="chatbubbles" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="documents"
          options={{
            title: 'Documents',
            tabBarIcon: ({ color, size }) => <Ionicons name="document-text" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            title: 'Alerts',
            tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
            tabBarBadgeStyle: { backgroundColor: Colors.gold, color: Colors.black },
            tabBarIcon: ({ color, size }) => <Ionicons name="notifications" color={color} size={size} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => <Ionicons name="person" color={color} size={size} />,
          }}
        />

        {/* Hidden routes — reached via in-app navigation, not the tab bar. */}
        <Tabs.Screen name="contracts" options={{ href: null }} />
        <Tabs.Screen name="application-status" options={{ href: null }} />
        <Tabs.Screen name="training-updates/[dogId]" options={{ href: null }} />
        <Tabs.Screen name="puppy-tracker/[puppyId]" options={{ href: null }} />
        <Tabs.Screen name="add-photos/[dogId]" options={{ href: null }} />
        <Tabs.Screen name="training/index" options={{ href: null }} />
        <Tabs.Screen name="training/bookings" options={{ href: null }} />
        <Tabs.Screen name="training/videos/index" options={{ href: null }} />
        <Tabs.Screen name="training/videos/[categoryId]" options={{ href: null }} />
        <Tabs.Screen name="training/videos/play/[videoId]" options={{ href: null }} />
        <Tabs.Screen name="vaccination-records" options={{ href: null }} />
        <Tabs.Screen name="invoices/index" options={{ href: null }} />
        <Tabs.Screen name="invoices/[id]" options={{ href: null }} />
      </Tabs>
      <WhatsAppFab />
      </View>
    </AuthGuard>
  );
}
