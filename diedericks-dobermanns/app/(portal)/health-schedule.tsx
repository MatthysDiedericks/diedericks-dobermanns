import { View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useDogHealthSchedule } from '@/hooks/useDogHealthSchedule';
import { dueWording } from '@/lib/dogs/healthCalendar';
import { formatKennelDate } from '@/lib/kennel/formatters';

export default function HealthScheduleScreen() {
  const { upcoming, loading, error } = useDogHealthSchedule();

  return (
    <ScreenContainer>
      <PageHeader eyebrow="My Dogs" title="Health Schedule" />

      <View className="px-6 pb-10">
        {loading ? <CardListSkeleton count={3} /> : null}
        {error ? (
          <Typography variant="body" className="text-danger">
            {error}
          </Typography>
        ) : null}
        {!loading && upcoming.length === 0 ? (
          <EmptyState
            title="No schedule yet"
            message="Vaccination and deworming due dates for your dogs will appear here."
          />
        ) : null}
        {upcoming.map((entry) => (
          <Card key={entry.id} className="mb-2">
            <Typography variant="caption" className="text-gold">
              {entry.dogName.toUpperCase()}
            </Typography>
            <Typography variant="subtitle" className="mt-1">
              {entry.title}
            </Typography>
            <Typography variant="caption" className="mt-1 text-muted">
              {entry.kind === 'vaccination' ? 'Vaccination' : 'Deworming'} · Given{' '}
              {formatKennelDate(entry.eventDate)}
            </Typography>
            {dueWording(entry.nextDueDate) ? (
              <Typography variant="caption" className="mt-1 text-muted">
                {dueWording(entry.nextDueDate)}
              </Typography>
            ) : null}
          </Card>
        ))}
      </View>
    </ScreenContainer>
  );
}
