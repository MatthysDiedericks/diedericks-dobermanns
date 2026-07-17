import { View } from 'react-native';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useDogHealthSchedule } from '@/hooks/useDogHealthSchedule';
import { formatKennelDate } from '@/lib/kennel/formatters';

export default function HealthScheduleScreen() {
  const { byDog, loading, error } = useDogHealthSchedule();

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
        {!loading && byDog.length === 0 ? (
          <EmptyState
            title="No schedule yet"
            message="Vaccination and deworming due dates for your dogs will appear here."
          />
        ) : null}
        {byDog.map((group) => (
          <View key={group.dogId} className="mb-6">
            <Typography variant="label" className="mb-3 text-gold">
              {group.dogName.toUpperCase()}
            </Typography>
            {group.entries.map((entry) => (
              <Card key={entry.id} className="mb-2">
                <View className="flex-row items-center justify-between">
                  <Typography variant="subtitle">{entry.title}</Typography>
                  {entry.isOverdue ? <Badge label="Overdue" tone="danger" /> : null}
                  {!entry.isOverdue && entry.isUpcoming ? (
                    <Badge label="Due soon" tone="gold" />
                  ) : null}
                </View>
                <Typography variant="caption" className="mt-1 text-muted">
                  {entry.kind === 'vaccination' ? 'Vaccination' : 'Deworming'} · Given{' '}
                  {formatKennelDate(entry.eventDate)}
                </Typography>
                {entry.nextDueDate ? (
                  <Typography
                    variant="caption"
                    className={`mt-1 ${entry.isOverdue ? 'text-danger' : 'text-silver'}`}
                  >
                    Next due {formatKennelDate(entry.nextDueDate)}
                  </Typography>
                ) : null}
              </Card>
            ))}
          </View>
        ))}
      </View>
    </ScreenContainer>
  );
}
