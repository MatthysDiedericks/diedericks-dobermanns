import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';

import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';

export function FinanceAccessDenied() {
  return (
    <ScreenContainer>
      <View className="flex-1 items-center justify-center px-8">
        <Ionicons name="lock-closed" size={48} color={Colors.gold} />
        <Typography variant="title" className="mt-6 text-center text-gold">
          Access restricted
        </Typography>
        <Typography variant="body" className="mt-2 text-center text-subtle">
          Finance access is restricted to management.
        </Typography>
      </View>
    </ScreenContainer>
  );
}
