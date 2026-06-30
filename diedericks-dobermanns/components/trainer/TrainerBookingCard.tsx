import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';

import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import type { BookingStatus, TrainingBooking } from '@/types/app.types';

const STATUS_TONE: Record<BookingStatus, BadgeTone> = {
  pending: 'neutral',
  confirmed: 'gold',
  completed: 'success',
  cancelled: 'danger',
};

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })} · ${hh}:${mm}`;
}

function primaryPhoto(booking: TrainingBooking): string | null {
  const media = booking.dog?.media ?? [];
  const primary = media.find((m) => m.is_primary) ?? media[0];
  return primary?.thumbnail_url ?? primary?.url ?? null;
}

export function TrainerBookingCard({
  booking,
  onPress,
}: {
  booking: TrainingBooking;
  onPress: () => void;
}) {
  const photo = primaryPhoto(booking);

  return (
    <Pressable onPress={onPress}>
      <Card className="flex-row items-center gap-3">
        <View className="h-14 w-14 overflow-hidden rounded-xl bg-surface">
          {photo ? (
            <Image source={{ uri: photo }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Ionicons name="paw" size={22} color={Colors.silver} />
            </View>
          )}
        </View>
        <View className="flex-1">
          <View className="flex-row items-center">
            <Typography variant="subtitle" className="flex-1">
              {booking.dog?.name ?? 'No dog linked'}
            </Typography>
            <Badge label={STATUS_LABEL[booking.status]} tone={STATUS_TONE[booking.status]} />
          </View>
          <Typography variant="caption" className="mt-0.5">
            {booking.client?.full_name ?? 'Client'} · {booking.session_type?.name ?? 'Session'}
          </Typography>
          <Typography variant="caption" className="mt-0.5 text-gold">
            {formatWhen(booking.scheduled_at)}
          </Typography>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.goldMuted} />
      </Card>
    </Pressable>
  );
}

export function formatTrainerWhen(iso: string): string {
  return formatWhen(iso);
}
