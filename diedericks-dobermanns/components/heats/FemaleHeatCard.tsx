import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useRef } from 'react';
import { Animated, Pressable, View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import type { FemaleHeatSummary } from '@/lib/heats/constants';
import { formatKennelDate } from '@/lib/kennel/formatters';

interface FemaleHeatCardProps {
  summary: FemaleHeatSummary;
  onPress: () => void;
}

function PulsingDot() {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.35, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{ opacity }}
      className="h-2.5 w-2.5 rounded-full bg-danger"
    />
  );
}

export function FemaleHeatCard({ summary, onPress }: FemaleHeatCardProps) {
  const { activeHeat, nextPredicted, isOverdue, daysInHeat, daysUntilNext, daysOverdue } =
    summary;

  let statusLine: React.ReactNode;
  if (activeHeat) {
    statusLine = (
      <View className="flex-row items-center gap-2">
        <PulsingDot />
        <Typography variant="caption" className="text-danger">
          In Heat — Day {(daysInHeat ?? 0) + 1}
        </Typography>
      </View>
    );
  } else if (isOverdue && nextPredicted) {
    statusLine = (
      <View className="flex-row items-center gap-2">
        <Ionicons name="warning" size={14} color="#fb923c" />
        <Typography variant="caption" style={{ color: '#fb923c' }}>
          Overdue — expected {formatKennelDate(nextPredicted.heat_start_date)},{' '}
          {daysOverdue} days late
        </Typography>
      </View>
    );
  } else if (nextPredicted) {
    statusLine = (
      <View className="flex-row items-center gap-2">
        <Ionicons name="time-outline" size={14} color={Colors.gold} />
        <Typography variant="caption" className="text-muted">
          Next heat: {formatKennelDate(nextPredicted.heat_start_date)}
          {daysUntilNext != null ? ` (in ${daysUntilNext} days)` : ''}
        </Typography>
      </View>
    );
  } else {
    statusLine = (
      <Typography variant="caption" className="text-muted">
        No heat history
      </Typography>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 flex-row items-center rounded-xl border border-gold/20 bg-surface p-4"
    >
      <View className="mr-3 h-12 w-12 overflow-hidden rounded-full bg-black-rich">
        {summary.photoUrl ? (
          <Image source={{ uri: summary.photoUrl }} style={{ width: 48, height: 48 }} contentFit="cover" />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Ionicons name="paw" size={20} color={Colors.gold} />
          </View>
        )}
      </View>
      <View className="flex-1">
        <Typography variant="subtitle">{summary.name}</Typography>
        <View className="mt-1">{statusLine}</View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.gold} />
    </Pressable>
  );
}
