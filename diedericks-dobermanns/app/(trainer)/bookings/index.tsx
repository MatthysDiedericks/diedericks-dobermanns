import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';

import { TrainerBookingCard } from '@/components/trainer/TrainerBookingCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useTrainerBookings } from '@/hooks/useTrainer';

type Tab = 'today' | 'upcoming';

export default function TrainerBookingsScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('today');
  const { today, upcoming, loading, refresh } = useTrainerBookings();
  const rows = tab === 'today' ? today : upcoming;

  return (
    <ScreenContainer
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor="#C4A35A" />}
    >
      <PageHeader eyebrow="Training" title="My Sessions" back={false} />

      <View className="mb-4 flex-row gap-2 px-6">
        {(['today', 'upcoming'] as Tab[]).map((t) => {
          const active = tab === t;
          return (
            <Pressable
              key={t}
              onPress={() => setTab(t)}
              className={`flex-1 rounded-full border py-2 ${active ? 'border-gold bg-gold/15' : 'border-gold/20 bg-surface'}`}
            >
              <Typography variant="caption" className={`text-center ${active ? 'text-gold' : 'text-ink-muted'}`}>
                {t === 'today' ? 'Today' : 'Upcoming'}
              </Typography>
            </Pressable>
          );
        })}
      </View>

      <View className="gap-3 px-6">
        {!loading && rows.length === 0 ? (
          <View className="items-center">
            <Ionicons name="calendar-outline" size={36} color={Colors.gold} style={{ marginBottom: 12 }} />
            <EmptyState
              title="No sessions scheduled"
              message={
                tab === 'today'
                  ? 'Nothing on your calendar for today.'
                  : 'No upcoming sessions assigned to you.'
              }
              className="w-full"
            />
          </View>
        ) : (
          rows.map((b) => (
            <TrainerBookingCard
              key={b.id}
              booking={b}
              onPress={() => router.push(`/(trainer)/bookings/${b.id}` as never)}
            />
          ))
        )}
      </View>
    </ScreenContainer>
  );
}
