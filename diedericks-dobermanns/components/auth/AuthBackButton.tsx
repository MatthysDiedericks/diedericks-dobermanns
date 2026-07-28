import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';

import { Colors } from '@/constants/colors';

/**
 * Consistent back control for public auth screens (sign-up, verify-code,
 * forgot/reset password) — these screens don't use `PageHeader`, so users
 * previously had no way back except small text links. Falls back to the
 * login screen when there's nothing to go back to.
 */
export function AuthBackButton() {
  const router = useRouter();

  function handleBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/(public)/login');
  }

  return (
    <Pressable
      onPress={handleBack}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      accessibilityRole="button"
      accessibilityLabel="Go back"
      className="mb-4 h-9 w-9 items-center justify-center rounded-full border border-gold/30 bg-black-rich"
    >
      <Ionicons name="chevron-back" size={18} color={Colors.gold} />
    </Pressable>
  );
}
