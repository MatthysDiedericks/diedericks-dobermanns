import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { LINE_COLORS, MALE_CARD_SIZE } from '@/lib/breeding/constants';
import { healthGatePassed, healthGatePending } from '@/lib/breeding/rules';
import type { CardLayout, PlannerDog } from '@/types/breeding';

interface MaleCardProps {
  male: PlannerDog;
  onLayout?: (layout: CardLayout) => void;
}

export function MaleCard({ male, onLayout }: MaleCardProps) {
  const lineColor = LINE_COLORS[male.line ?? 'Unknown'] ?? LINE_COLORS.Unknown;
  const cleared = healthGatePassed(male);
  const pending = healthGatePending(male);

  return (
    <Pressable
      onLayout={(e) => onLayout?.(e.nativeEvent.layout)}
      className="items-center rounded-2xl border border-gold/20 bg-[#1C1A0E] p-3"
    >
      <View
        className="mb-2 overflow-hidden rounded-full border-2"
        style={{ width: MALE_CARD_SIZE, height: MALE_CARD_SIZE, borderColor: lineColor }}
      >
        {male.photo_url ? (
          <Image source={{ uri: male.photo_url }} style={{ width: '100%', height: '100%' }} />
        ) : (
          <View className="h-full w-full items-center justify-center bg-surface">
            <Typography variant="caption">{male.name.slice(0, 1)}</Typography>
          </View>
        )}
      </View>
      <Typography variant="label" className="text-center">
        {male.name}
      </Typography>
      <View className="mt-1 rounded-full px-2 py-0.5" style={{ backgroundColor: `${lineColor}33` }}>
        <Typography variant="caption" style={{ color: lineColor }}>
          Line {male.line ?? '?'} · Gen {male.generation ?? 1}
        </Typography>
      </View>
      <Typography variant="caption" className={cleared ? 'text-success' : pending ? 'text-gold' : 'text-danger'}>
        {cleared ? '✓ Health Clear' : pending ? '⚠ Pending' : '✗ Gate failed'}
      </Typography>
    </Pressable>
  );
}
