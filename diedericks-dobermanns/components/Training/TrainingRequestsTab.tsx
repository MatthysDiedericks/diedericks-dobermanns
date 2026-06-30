import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { BookingCard } from '@/components/Training/BookingCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Typography } from '@/components/ui/Typography';
import { useClients } from '@/hooks/useAdmin';
import { useAdminTrainingBookings } from '@/hooks/useTraining';
import {
  assignTrainer,
  cancelBooking,
  completeBooking,
  confirmBooking,
  useSubmitting,
} from '@/hooks/useMutations';
import { useAuthStore } from '@/stores/authStore';
import type { BookingStatus, TrainingBooking } from '@/types/app.types';

const STATUS_FILTERS: (BookingStatus | 'all')[] = ['all', 'pending', 'confirmed', 'completed', 'cancelled'];

export function TrainingRequestsTab() {
  const { data: bookings, refetch } = useAdminTrainingBookings();
  const { data: clients } = useClients();
  const { submitting, run } = useSubmitting();
  const adminId = useAuthStore((s) => s.profile?.id);

  const [filter, setFilter] = useState<BookingStatus | 'all'>('all');
  const [videoUrlFor, setVideoUrlFor] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [assignFor, setAssignFor] = useState<string | null>(null);

  const trainers = clients.filter((c) => c.role === 'trainer');
  const filtered = bookings.filter((b) => filter === 'all' || b.status === filter);

  async function act(fn: () => Promise<{ error: string | null }>) {
    await run(fn);
    await refetch();
  }

  async function doConfirm(b: TrainingBooking) {
    if (b.session_format === 'video_call' && videoUrlFor !== b.id) {
      setVideoUrlFor(b.id);
      setVideoUrl(b.video_room_url ?? '');
      return;
    }
    await act(() => confirmBooking(b.id, b.session_format === 'video_call' ? videoUrl.trim() || null : null));
    setVideoUrlFor(null);
    setVideoUrl('');
  }

  return (
    <View className="px-6">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {STATUS_FILTERS.map((f) => {
          const active = filter === f;
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              className={`rounded-full border px-3 py-1.5 ${active ? 'border-gold bg-gold/15' : 'border-gold/20 bg-surface'}`}
            >
              <Typography variant="caption" className={active ? 'text-gold' : 'text-ink-muted'}>{f}</Typography>
            </Pressable>
          );
        })}
      </ScrollView>

      <View className="mt-4 gap-3">
        {filtered.length === 0 ? (
          <EmptyState title="No bookings" />
        ) : (
          filtered.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              videoUrlFor={videoUrlFor}
              videoUrl={videoUrl}
              onVideoUrlChange={setVideoUrl}
              assignFor={assignFor}
              trainers={trainers}
              submitting={submitting}
              onConfirm={() => doConfirm(b)}
              onComplete={() => act(() => completeBooking(b.id))}
              onCancel={() => adminId && act(() => cancelBooking(b.id, adminId))}
              onToggleAssign={() => setAssignFor(assignFor === b.id ? null : b.id)}
              onAssignTrainer={async (trainerId) => {
                await act(() => assignTrainer(b.id, trainerId));
                setAssignFor(null);
              }}
            />
          ))
        )}
      </View>
    </View>
  );
}
