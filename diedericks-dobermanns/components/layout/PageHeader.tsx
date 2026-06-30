import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';

interface PageHeaderProps {
  title: string;
  eyebrow?: string;
  /** Show a back chevron (defaults to true). */
  back?: boolean;
}

export function PageHeader({ title, eyebrow, back = true }: PageHeaderProps) {
  const router = useRouter();
  return (
    <View className="px-6 pb-4">
      {back ? (
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          className="mb-4 h-9 w-9 items-center justify-center rounded-full border border-gold/30 bg-black-rich"
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={18} color={Colors.gold} />
        </Pressable>
      ) : null}
      {eyebrow ? (
        <Typography variant="label" className="mb-1">
          {eyebrow}
        </Typography>
      ) : null}
      <Typography variant="displayLg">{title}</Typography>
      <View className="mt-3 h-px w-12 bg-gold" />
    </View>
  );
}
