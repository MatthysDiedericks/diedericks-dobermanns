import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { TrainingBookingDetail } from '@/components/Training/TrainingBookingDetail';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { Colors } from '@/constants/colors';
import { useBookingById } from '@/hooks/useTraining';

export default function TrainingBookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { booking, loading, error, refresh } = useBookingById(id);

  if (loading) {
    return (
      <ScreenContainer scroll={false} className="items-center justify-center">
        <ActivityIndicator color={Colors.gold} />
      </ScreenContainer>
    );
  }

  if (error || !booking) {
    return (
      <ScreenContainer>
        <PageHeader title="Training booking" />
        <View className="gap-4 px-6">
          <Typography variant="body" className="text-danger">
            {error ?? 'Booking not found.'}
          </Typography>
          <Button label="Retry" variant="outline" size="sm" onPress={() => void refresh()} />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Training" title={booking.client?.full_name ?? 'Booking'} />
      <TrainingBookingDetail booking={booking} bookingId={id ?? booking.id} onRefresh={refresh} />
    </ScreenContainer>
  );
}
