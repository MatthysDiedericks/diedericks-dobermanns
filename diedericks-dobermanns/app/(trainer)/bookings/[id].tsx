import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { Alert, Linking, View } from 'react-native';

import { SessionMediaGrid } from '@/components/trainer/SessionMediaGrid';
import { SessionNotesSection } from '@/components/trainer/SessionNotesSection';
import { formatTrainerWhen } from '@/components/trainer/TrainerBookingCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { completeBooking, useSubmitting } from '@/hooks/useMutations';
import { useSessionDogMedia, useTrainerBooking } from '@/hooks/useTrainer';
import type { BookingStatus } from '@/types/app.types';

const STATUS_TONE: Record<BookingStatus, BadgeTone> = {
  pending: 'neutral',
  confirmed: 'gold',
  completed: 'success',
  cancelled: 'danger',
};

export default function TrainerBookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { booking, loading, refresh } = useTrainerBooking(id);
  const { submitting, run } = useSubmitting();
  const dogId = booking?.dog_id ?? booking?.dog?.id ?? '';
  const { media, refresh: refreshMedia } = useSessionDogMedia(dogId, id ?? '');

  async function markComplete() {
    if (!booking) return;
    Alert.alert('Mark session complete?', 'This will close the session for the client.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Complete',
        onPress: async () => {
          const { error } = await run(() => completeBooking(booking.id));
          if (error) {
            Alert.alert('Error', error);
            return;
          }
          Alert.alert('Session complete', 'Great work — session marked as completed.');
          await refresh();
        },
      },
    ]);
  }

  if (loading && !booking) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center">
        <Typography variant="bodyMuted">Loading session…</Typography>
      </ScreenContainer>
    );
  }

  if (!booking) {
    return (
      <ScreenContainer>
        <PageHeader title="Session" />
        <View className="px-6">
          <Typography variant="bodyMuted">Session not found or not assigned to you.</Typography>
        </View>
      </ScreenContainer>
    );
  }

  const mediaList = booking.dog?.media ?? [];
  const hero = mediaList.find((m) => m.is_primary) ?? mediaList[0];

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Session" title={booking.dog?.name ?? 'Training session'} />

      <View className="px-6">
        <Card>
          <View className="mb-4 h-48 overflow-hidden rounded-xl bg-surface">
            {hero?.url ? (
              <Image source={{ uri: hero.url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
            ) : (
              <View className="flex-1 items-center justify-center">
                <Ionicons name="paw" size={40} color={Colors.silver} />
              </View>
            )}
          </View>
          <View className="flex-row items-start">
            <View className="flex-1">
              <Typography variant="subtitle">{booking.dog?.name ?? 'No dog linked'}</Typography>
              <Typography variant="caption" className="mt-1">
                {booking.client?.full_name ?? 'Client'}
              </Typography>
              <Typography variant="caption" className="mt-1 text-gold">
                {formatTrainerWhen(booking.scheduled_at)} · {booking.duration_minutes} min
              </Typography>
              <Typography variant="caption" className="mt-0.5">
                {booking.session_type?.name ?? 'Session'}
              </Typography>
            </View>
            <Badge label={booking.status} tone={STATUS_TONE[booking.status]} />
          </View>
        </Card>

        {booking.status === 'confirmed' && booking.video_host_url ? (
          <Button
            label="Join Video Call"
            onPress={() => Linking.openURL(booking.video_host_url!)}
            fullWidth
            className="mt-4"
          />
        ) : null}

        <SectionHeader eyebrow="Notes" title="Session notes" className="mt-8" />
        <SessionNotesSection
          bookingId={booking.id}
          initialNotes={booking.trainer_notes}
          updatedAt={booking.updated_at}
          onSaved={refresh}
        />

        {booking.status === 'confirmed' ? (
          <Button
            label="Mark Session Complete"
            onPress={markComplete}
            loading={submitting}
            fullWidth
            className="mt-6"
          />
        ) : null}

        {dogId ? (
          <>
            <SectionHeader eyebrow="Media" title="Session photos" className="mt-8" />
            <SessionMediaGrid dogId={dogId} bookingId={booking.id} media={media} refresh={refreshMedia} />
          </>
        ) : null}
      </View>
    </ScreenContainer>
  );
}
