import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';

interface BreedingActionCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle: string;
  onPress: () => void;
}

export function BreedingActionCard({ icon, label, subtitle, onPress }: BreedingActionCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className="mb-3 flex-row items-center rounded-2xl border border-gold/20 bg-[#1C1A0E] p-4"
    >
      <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-gold/15">
        <Ionicons name={icon} size={20} color={Colors.gold} />
      </View>
      <View className="flex-1">
        <Typography variant="label" className="text-gold">
          {label}
        </Typography>
        <Typography variant="caption" className="text-subtle">
          {subtitle}
        </Typography>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.silver} />
    </Pressable>
  );
}
