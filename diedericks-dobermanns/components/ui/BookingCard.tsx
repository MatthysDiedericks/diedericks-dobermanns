import { Linking, Pressable, View } from 'react-native';

import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import type { TrainingBooking } from '@/types/app.types';

interface Props {
  booking: TrainingBooking;
  when: string;
  countdown?: string;
  onJoin?: () => void;
  onCancel?: () => void;
  onPress?: () => void;
}

export function BookingCard({ booking, when, countdown, onJoin, onCancel, onPress }: Props) {
  const body = (
    <>
      <View className="flex-row items-center justify-between">
        <Typography variant="subtitle" className="flex-1 pr-2">
          {booking.session_type?.name ?? 'Training Session'}
        </Typography>
        <StatusBadge status={booking.status} />
      </View>
      <Typography variant="caption" className="mt-1 text-silver">
        {when}
      </Typography>
      <Typography variant="caption" className="mt-1">
        {booking.session_format === 'video_call' ? 'Video Call' : 'In Person'}
        {booking.dog?.name ? ` · ${booking.dog.name}` : ''}
      </Typography>
      {onJoin ? (
        <View className="mt-3">
          <Button label="Join Video Call" onPress={onJoin} fullWidth />
          {countdown ? (
            <Typography variant="caption" className="mt-1 text-center text-gold">
              {countdown}
            </Typography>
          ) : null}
        </View>
      ) : null}
      {onCancel ? (
        <Pressable onPress={onCancel} className="mt-3 self-start">
          <Typography variant="caption" className="text-danger">
            Cancel session
          </Typography>
        </Pressable>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress}>
        <Card>{body}</Card>
      </Pressable>
    );
  }

  return <Card>{body}</Card>;
}

export function openVideoUrl(url: string | null | undefined): void {
  if (url) void Linking.openURL(url);
}
