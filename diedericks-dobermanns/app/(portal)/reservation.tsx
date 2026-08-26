import { Image } from 'expo-image';
import { View } from 'react-native';
import { format, parseISO } from 'date-fns';

import { DogStatusBadge } from '@/components/dogs/DogStatusBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { usePortalReservation } from '@/hooks/usePortal';
import { formatPrice } from '@/lib/format';
import { supabaseThumbUrl } from '@/lib/thumbs';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between border-b border-gold/10 py-3">
      <Typography variant="caption">{label}</Typography>
      <Typography variant="body">{value}</Typography>
    </View>
  );
}

export default function ReservationScreen() {
  const { reservation, loading, error } = usePortalReservation();
  const dog = reservation?.dog;
  const photoUrl = dog?.media?.[0]?.url;
  const thumb = photoUrl ? supabaseThumbUrl(photoUrl, 'hero') : null;

  return (
    <ScreenContainer>
      <PageHeader eyebrow="Your Dog" title="My Reservation" back={false} />
      <View className="px-6">
        {loading ? <CardListSkeleton count={2} /> : null}
        {error ? <Typography variant="body" className="text-danger">{error}</Typography> : null}
        {!loading && !reservation ? (
          <EmptyState title="No active reservation" message="No active reservation found." />
        ) : null}
        {dog && reservation ? (
          <>
            <Card>
              <View className="flex-row items-center justify-between">
                <Typography variant="title">{dog.name}</Typography>
                <DogStatusBadge status={dog.status} />
              </View>
            </Card>

            <Card className="mt-4">
              <DetailRow label="Total price" value={formatPrice(reservation.total_price)} />
              <DetailRow label="Deposit" value={reservation.deposit_paid ? 'Paid' : 'Outstanding'} />
              <DetailRow label="Status" value={reservation.status} />
              <DetailRow
                label="Expected pickup"
                value={
                  reservation.expected_pickup_date
                    ? format(parseISO(reservation.expected_pickup_date), 'dd MMM yyyy')
                    : '—'
                }
              />
            </Card>

            {thumb ? (
              <View className="mt-4 w-full overflow-hidden rounded-xl bg-surface" style={{ maxHeight: 420 }}>
                <Image
                  source={{ uri: thumb }}
                  style={{ width: '100%', height: 280 }}
                  contentFit="cover"
                  contentPosition={{ top: '30%', left: '50%' }}
                />
              </View>
            ) : null}
          </>
        ) : null}
      </View>
    </ScreenContainer>
  );
}
