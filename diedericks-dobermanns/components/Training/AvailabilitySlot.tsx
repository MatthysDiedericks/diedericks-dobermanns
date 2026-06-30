import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import type { TrainingAvailability } from '@/types/app.types';

export function AvailabilitySlot({
  slot,
  typeName,
  onDelete,
}: {
  slot: TrainingAvailability;
  typeName: string;
  onDelete: () => void;
}) {
  return (
    <Card className="flex-row items-center">
      <View className="flex-1">
        <Typography variant="body">
          {slot.available_date} · {slot.start_time}–{slot.end_time}
        </Typography>
        <Typography variant="caption" className="mt-0.5">
          {typeName} · max {slot.max_bookings}
          {slot.is_blocked ? ' · blocked' : ''}
        </Typography>
      </View>
      <Pressable onPress={onDelete} hitSlop={8}>
        <Ionicons name="trash" size={18} color={Colors.danger} />
      </Pressable>
    </Card>
  );
}
