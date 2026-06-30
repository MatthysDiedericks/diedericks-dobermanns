import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, View } from 'react-native';
import { useState } from 'react';

import { DocumentSection } from '@/components/documents/DocumentList';
import { formatTrainingDateTime } from '@/components/Training/trainingFormatters';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { confirmBooking, completeBooking, saveTrainerNotes } from '@/lib/admin/mutations';
import { titleCase } from '@/lib/format';
import type { TrainingBooking } from '@/types/app.types';

function formatLabel(fmt: string): string {
  if (fmt === 'in_person') return 'In Person';
  if (fmt === 'video_call') return 'Video Call';
  return titleCase(fmt.replace(/_/g, ' '));
}

interface Props {
  booking: TrainingBooking;
  bookingId: string;
  onRefresh: () => void;
}

export function TrainingBookingDetail({ booking, bookingId, onRefresh }: Props) {
  const [trainerNotes, setTrainerNotes] = useState(booking.trainer_notes ?? '');
  const [savingNotes, setSavingNotes] = useState(false);
  const [acting, setActing] = useState(false);

  const runAction = async (fn: () => Promise<{ error: string | null }>) => {
    setActing(true);
    const { error } = await fn();
    setActing(false);
    if (!error) onRefresh();
  };

  const saveNotes = async () => {
    setSavingNotes(true);
    await saveTrainerNotes(bookingId, trainerNotes.trim());
    setSavingNotes(false);
    onRefresh();
  };

  return (
    <View className="px-6 pb-12">
      <Card className="mb-4">
        <View className="mb-3 flex-row items-center justify-between">
          <Badge label={titleCase(booking.status)} tone={booking.status === 'confirmed' ? 'gold' : 'neutral'} />
          <Badge label={formatLabel(booking.session_format)} tone="neutral" />
        </View>
        <Typography variant="subtitle">{booking.session_type?.name ?? 'Training session'}</Typography>
        <Typography variant="body" className="mt-2">
          {formatTrainingDateTime(booking.scheduled_at)} · {booking.duration_minutes} min
        </Typography>
      </Card>

      <Card className="mb-4">
        <Typography variant="label" className="mb-2 text-gold">
          Client
        </Typography>
        <Typography variant="body">{booking.client?.full_name ?? '—'}</Typography>
        {booking.client?.phone ? (
          <Typography variant="caption" className="text-silver">
            {booking.client.phone}
          </Typography>
        ) : null}
        {booking.dog ? (
          <Typography variant="caption" className="mt-2">
            Dog: {booking.dog.name}
          </Typography>
        ) : null}
        {booking.client_notes ? (
          <Typography variant="caption" className="mt-2 text-silver">
            Client notes: {booking.client_notes}
          </Typography>
        ) : null}
      </Card>

      <View className="mb-4 flex-row gap-2">
        {booking.status === 'pending' ? (
          <Button
            label="Confirm"
            size="sm"
            loading={acting}
            onPress={() => void runAction(() => confirmBooking(bookingId))}
            className="flex-1"
          />
        ) : null}
        {booking.status === 'confirmed' ? (
          <Button
            label="Mark complete"
            size="sm"
            variant="outline"
            loading={acting}
            onPress={() => void runAction(() => completeBooking(bookingId))}
            className="flex-1"
          />
        ) : null}
      </View>

      <Card className="mb-4">
        <Typography variant="label" className="mb-2">
          Trainer notes
        </Typography>
        <Input value={trainerNotes} onChangeText={setTrainerNotes} multiline className="min-h-[80px] mb-2" />
        <Button label="Save notes" size="sm" variant="outline" loading={savingNotes} onPress={() => void saveNotes()} />
      </Card>

      {(booking.media ?? []).length > 0 ? (
        <View className="mb-4">
          <Typography variant="label" className="mb-2 text-gold">
            Session media
          </Typography>
          <View className="flex-row flex-wrap gap-2">
            {booking.media!.map((m) => (
              <View key={m.id} className="h-24 w-24 overflow-hidden rounded-xl border border-gold/30 bg-surface">
                {m.public_url && m.media_type === 'image' ? (
                  <Image source={{ uri: m.public_url }} className="h-full w-full" resizeMode="cover" />
                ) : (
                  <View className="flex-1 items-center justify-center">
                    <Ionicons name="videocam-outline" size={28} color={Colors.gold} />
                  </View>
                )}
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <DocumentSection entityType="training" entityId={bookingId} title="Training documents" />
    </View>
  );
}
