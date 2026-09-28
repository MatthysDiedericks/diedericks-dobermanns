import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Pressable, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AdminDashboardContent } from '@/components/dashboard/AdminDashboardContent';
import { ExpiryBanner, ExpiryBell } from '@/components/admin/ExpiryAlerts';
import { ParentageHealthStrip } from '@/components/dashboard/ParentageHealthStrip';
import { Colors } from '@/constants/colors';
import { useAuthStore } from '@/stores/authStore';

export default function AdminDashboard() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  function confirmSignOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: () => void logout().then(() => router.replace('/(public)/login')),
      },
    ]);
  }

  return (
    <ScreenContainer>
      <View className="px-6">
        <ExpiryBanner />
      </View>
      <PageHeader
        eyebrow="Admin"
        title="Dashboard"
        back={false}
        rightSlot={
          <View className="flex-row items-center gap-2">
            <ExpiryBell />
            <Pressable
              onPress={confirmSignOut}
              className="h-9 w-9 items-center justify-center rounded-full border border-gold/30 bg-black-rich"
              accessibilityRole="button"
              accessibilityLabel="Sign out"
            >
              <Ionicons name="log-out-outline" size={18} color={Colors.gold} />
            </Pressable>
          </View>
        }
      />
      <ParentageHealthStrip />
      <AdminDashboardContent />
    </ScreenContainer>
  );
}
