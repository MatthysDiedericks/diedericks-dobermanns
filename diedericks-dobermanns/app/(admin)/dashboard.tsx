import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, Pressable } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { AdminDashboardContent } from '@/components/dashboard/AdminDashboardContent';
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
      <PageHeader
        eyebrow="Admin"
        title="Dashboard"
        back={false}
        rightSlot={
          <Pressable
            onPress={confirmSignOut}
            className="h-9 w-9 items-center justify-center rounded-full border border-gold/30 bg-black-rich"
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            <Ionicons name="log-out-outline" size={18} color={Colors.gold} />
          </Pressable>
        }
      />
      <AdminDashboardContent />
    </ScreenContainer>
  );
}
