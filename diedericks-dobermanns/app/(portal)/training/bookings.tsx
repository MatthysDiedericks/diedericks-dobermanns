import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge, type BadgeTone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useClientBookings } from '@/hooks/useTraining';
import { cancelBooking, useSubmitting } from '@/hooks/useMutations';
import { useAuthStore } from '@/stores/authStore';
import type { BookingStatus, TrainingBooking } from '@/types/app.types';

const STATUS_TONE: Record<BookingStatus, BadgeTone> = {
  pending: 'neutral',
  confirmed: 'gold',
  completed: 'success',
  cancelled: 'danger',
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function formatWhen(iso: string): string {
  const d = new Date(iso);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${DAYS[d.getDay()]}, ${d.getDate()} ${MONTHS[d.getMonth()]} · ${hh}:${mm}`;
}

function countdown(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'Starting now';
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `in ${mins} min`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `in ${hrs} hr${hrs === 1 ? '' : 's'}`;
  const days = Math.round(hrs / 24);
  return `in ${days} day${days === 1 ? '' : 's'}`;
}

export default function MyBookingsScreen() {
  const router = useRouter();
  const clientId = useAuthStore((s) => s.profile?.id);
  const { data: bookings, loading, refetch } = useClientBookings();
  const { submitting, run } = useSubmitting();
  const [showMediaFor, setShowMediaFor] = useState<string | null>(null);

  async function cancel(b: TrainingBooking) {
    if (!clientId) return;
    await run(() => cancelBooking(b.id, clientId));
    await refetch();
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Training" title="My Sessions" back={false} />

      <View className="px-6">
        <Button
          label="+ Book a Session"
          variant="outline"
          onPress={() => router.push('/(portal)/training/index' as never)}
          fullWidth
          className="mb-4"
        />

        <View className="gap-3">
          {!loading && bookings.length === 0 ? (
            <EmptyState title="No sessions yet" message="Book your first training session to get started." />
          ) : (
            bookings.map((b) => {
              const canJoin =
                b.status === 'confirmed' &&
                b.session_format === 'video_call' &&
                !!b.video_room_url;
              const hasMedia = b.status === 'completed' && (b.media?.length ?? 0) > 0;
              const canCancel = b.status === 'pending' || b.status === 'confirmed';
              return (
                <Card key={b.id}>
                  <View className="flex-row items-center">
                    <Typography variant="subtitle" className="flex-1">
                      {b.session_type?.name ?? 'Training Session'}
                    </Typography>
                    <Badge label={b.status} tone={STATUS_TONE[b.status]} />
                  </View>
                  <Typography variant="caption" className="mt-1">
                    {formatWhen(b.scheduled_at)}
                  </Typography>
                  <View className="mt-2 flex-row flex-wrap items-center gap-2">
                    <Badge
                      label={b.session_format === 'video_call' ? 'Video Call' : 'In Person'}
                      tone="muted"
                    />
                    {b.dog?.name ? <Badge label={b.dog.name} tone="muted" /> : null}
                  </View>

                  {b.client_notes ? (
                    <Typography variant="bodyMuted" className="mt-2">
                      {b.client_notes}
                    </Typography>
                  ) : null}

                  {b.status === 'completed' && b.trainer_notes ? (
                    <View className="mt-3 rounded-xl border border-gold/20 bg-black-rich p-3">
                      <Typography variant="label" className="mb-1">
                        Trainer notes
                      </Typography>
                      <Typography variant="bodyMuted">{b.trainer_notes}</Typography>
                    </View>
                  ) : null}

                  {canJoin ? (
                    <View className="mt-3">
                      <Button
                        label="Join Video Call"
                        onPress={() => b.video_room_url && Linking.openURL(b.video_room_url)}
                        fullWidth
                      />
                      <Typography variant="caption" className="mt-1 text-center text-gold">
                        {countdown(b.scheduled_at)}
                      </Typography>
                    </View>
                  ) : null}

                  {hasMedia ? (
                    <View className="mt-3">
                      <Pressable
                        onPress={() => setShowMediaFor(showMediaFor === b.id ? null : b.id)}
                        className="flex-row items-center"
                      >
                        <Ionicons name="images" size={16} color={Colors.gold} />
                        <Typography variant="label" className="ml-2">
                          {showMediaFor === b.id ? 'Hide session media' : 'View session media'}
                        </Typography>
                      </Pressable>
                      {showMediaFor === b.id ? (
                        <View className="mt-3 flex-row flex-wrap gap-2">
                          {b.media?.map((m) =>
                            m.public_url ? (
                              <View key={m.id} className="h-24 w-24 overflow-hidden rounded-xl bg-surface">
                                <Image
                                  source={{ uri: m.public_url }}
                                  style={{ width: '100%', height: '100%' }}
                                  contentFit="cover"
                                />
                              </View>
                            ) : null,
                          )}
                        </View>
                      ) : null}
                    </View>
                  ) : null}

                  {canCancel ? (
                    <Pressable onPress={() => cancel(b)} disabled={submitting} className="mt-3 self-start">
                      <Typography variant="caption" className="text-danger">
                        Cancel session
                      </Typography>
                    </Pressable>
                  ) : null}
                </Card>
              );
            })
          )}
        </View>
      </View>
    </ScreenContainer>
  );
}
