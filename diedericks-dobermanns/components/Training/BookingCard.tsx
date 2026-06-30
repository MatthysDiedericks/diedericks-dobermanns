import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import type { BookingStatus, TrainingBooking } from '@/types/app.types';

import { formatTrainingDateTime } from './trainingFormatters';

const STATUS_TONE: Record<BookingStatus, BadgeTone> = {
  pending: 'neutral',
  confirmed: 'gold',
  completed: 'success',
  cancelled: 'danger',
};

export function BookingCard({
  booking,
  compact,
  videoUrlFor,
  videoUrl,
  onVideoUrlChange,
  assignFor,
  trainers,
  submitting,
  onConfirm,
  onComplete,
  onCancel,
  onToggleAssign,
  onAssignTrainer,
}: {
  booking: TrainingBooking;
  compact?: boolean;
  videoUrlFor?: string | null;
  videoUrl?: string;
  onVideoUrlChange?: (v: string) => void;
  assignFor?: string | null;
  trainers?: { id: string; full_name: string | null }[];
  submitting?: boolean;
  onConfirm?: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
  onToggleAssign?: () => void;
  onAssignTrainer?: (trainerId: string) => void;
}) {
  const router = useRouter();

  if (compact) {
    return (
      <Card>
        <Typography variant="subtitle">{booking.client?.full_name ?? 'Client'}</Typography>
        <Typography variant="caption" className="mt-1">
          {booking.session_type?.name} · {formatTrainingDateTime(booking.scheduled_at)}
        </Typography>
      </Card>
    );
  }

  return (
    <Card>
      <View className="flex-row items-center">
        <Pressable
          className="flex-1"
          onPress={() => router.push(`/(admin)/training/${booking.id}` as never)}
        >
          <Typography variant="subtitle">
            {booking.client?.full_name ?? 'Client'}
          </Typography>
        </Pressable>
        <Badge label={booking.status} tone={STATUS_TONE[booking.status]} />
      </View>
      <Typography variant="caption" className="mt-1">
        {booking.session_type?.name ?? 'Session'} · {formatTrainingDateTime(booking.scheduled_at)}
      </Typography>
      <View className="mt-2 flex-row flex-wrap items-center gap-2">
        <Badge label={booking.session_format === 'video_call' ? 'Video' : 'In Person'} tone="muted" />
        {booking.dog?.name ? <Badge label={booking.dog.name} tone="muted" /> : null}
        {booking.trainer?.full_name ? <Badge label={`Trainer: ${booking.trainer.full_name}`} tone="neutral" /> : null}
      </View>
      {booking.client_notes ? (
        <Typography variant="bodyMuted" className="mt-2">“{booking.client_notes}”</Typography>
      ) : null}

      {videoUrlFor === booking.id && onVideoUrlChange ? (
        <View className="mt-3">
          <Input
            label="Video room URL (paste Google Meet / Daily link)"
            value={videoUrl ?? ''}
            onChangeText={onVideoUrlChange}
            autoCapitalize="none"
            placeholder="https://meet.google.com/..."
          />
        </View>
      ) : null}

      {assignFor === booking.id && trainers && onAssignTrainer ? (
        <View className="mt-3">
          <Typography variant="label" className="mb-2">Assign trainer</Typography>
          <View className="flex-row flex-wrap gap-2">
            {trainers.length === 0 ? (
              <Typography variant="caption">No trainer accounts found.</Typography>
            ) : (
              trainers.map((t) => (
                <Pressable
                  key={t.id}
                  onPress={() => onAssignTrainer(t.id)}
                  className="rounded-xl border border-gold/30 bg-surface px-3 py-2"
                >
                  <Typography variant="caption" className="text-gold">{t.full_name}</Typography>
                </Pressable>
              ))
            )}
          </View>
        </View>
      ) : null}

      {onConfirm || onComplete || onCancel || onToggleAssign ? (
        <View className="mt-3 flex-row flex-wrap gap-2">
          {onConfirm && (booking.status === 'pending' || booking.status === 'confirmed') ? (
            <Button
              label={
                booking.status === 'pending'
                  ? booking.session_format === 'video_call' && videoUrlFor !== booking.id
                    ? 'Confirm + Video'
                    : 'Confirm'
                  : 'Re-confirm'
              }
              size="sm"
              onPress={onConfirm}
              loading={submitting}
            />
          ) : null}
          {onComplete && booking.status !== 'completed' && booking.status !== 'cancelled' ? (
            <Button label="Complete" size="sm" variant="secondary" onPress={onComplete} />
          ) : null}
          {onCancel && booking.status !== 'cancelled' ? (
            <Button label="Cancel" size="sm" variant="secondary" onPress={onCancel} />
          ) : null}
          {onToggleAssign ? (
            <Button
              label="Assign"
              size="sm"
              variant="outline"
              onPress={onToggleAssign}
            />
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}
