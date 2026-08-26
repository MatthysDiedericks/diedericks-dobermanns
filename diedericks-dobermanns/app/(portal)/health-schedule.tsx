import { View } from 'react-native';

import { RemindMeBlock } from '@/components/portal/RemindMeBlock';
import { VetPaperworkCard } from '@/components/portal/VetPaperworkCard';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CardListSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenContainer } from '@/components/ui/ScreenContainer';
import { Typography } from '@/components/ui/Typography';
import { useDogHealthSchedule } from '@/hooks/useDogHealthSchedule';
import { useHealthReminders, markHealthReminderDone } from '@/hooks/useHealthReminders';
import { usePortalDogs } from '@/hooks/usePortal';
import { dueWording } from '@/lib/dogs/healthCalendar';
import { formatKennelDate } from '@/lib/kennel/formatters';
import { useAuthStore } from '@/stores/authStore';

export default function HealthScheduleScreen() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const { dogs } = usePortalDogs();
  const { upcoming, loading, error, refresh } = useDogHealthSchedule();
  const { reminders, refresh: refreshReminders } = useHealthReminders(userId ?? '');
  const ownerOpen = reminders.filter((r) => !r.is_done);

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
        {!loading && upcoming.length === 0 && ownerOpen.length === 0 ? (
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
            <RemindMeBlock
              dogId={entry.dogId}
              kind={entry.kind}
              title={entry.title}
              dueDate={entry.nextDueDate}
              onSaved={() => void refreshReminders()}
            />
          </Card>
        ))}
        {ownerOpen.map((r) => (
          <Card key={r.id} className="mb-2 border border-dashed border-gold/40">
            <Typography variant="caption" className="text-gold">
              SET BY THE OWNER
            </Typography>
            <Typography variant="subtitle" className="mt-1">
              {r.title}
            </Typography>
            <Typography variant="caption" className="mt-1 text-muted">
              Due {formatKennelDate(r.due_date)}
            </Typography>
            {userId ? (
              <Button
                label="Mark done"
                variant="ghost"
                size="sm"
                className="mt-2 self-start"
                onPress={async () => {
                  await markHealthReminderDone(r.id, userId);
                  void refreshReminders();
                }}
              />
            ) : null}
          </Card>
        ))}

        <VetPaperworkCard
          dogs={dogs.map((d) => ({ id: d.id, name: d.name }))}
          onSaved={() => void refresh()}
        />
      </View>
    </ScreenContainer>
  );
}
