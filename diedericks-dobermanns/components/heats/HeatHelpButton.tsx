import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';

import { Colors } from '@/constants/colors';

export function HeatHelpButton() {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push('/(admin)/heats/reference' as never)}
      className="h-10 w-10 items-center justify-center rounded-full border border-gold/40 bg-gold/10"
      accessibilityLabel="Breeding reference guide"
    >
      <Ionicons name="help-circle-outline" size={22} color={Colors.gold} />
    </Pressable>
  );
}
