import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import {
  formatShortDate,
  upcomingDueLabel,
  type HealthCalendar,
} from '@/lib/dogs/healthCalendar';

export function HealthCalendarSection({
  calendar,
  vaccinationsCount,
  dewormingCount,
}: {
  calendar: HealthCalendar;
  vaccinationsCount: number;
  dewormingCount: number;
}) {
  return (
    <View className="mb-4 rounded-xl border border-gold/20 bg-surface p-4">
      <Typography variant="label" className="text-gold">
        WHAT&apos;S NEXT
      </Typography>
      {calendar.upcoming.length === 0 ? (
        <View className="mt-3">
          {vaccinationsCount === 0 ? (
            <Typography variant="caption" className="text-subtle">
              No vaccinations recorded yet
            </Typography>
          ) : null}
          {dewormingCount === 0 ? (
            <Typography variant="caption" className="text-subtle">
              No deworming recorded yet
            </Typography>
          ) : null}
          {vaccinationsCount > 0 && dewormingCount > 0 ? (
            <Typography variant="caption" className="text-subtle">
              Nothing scheduled next.
            </Typography>
          ) : null}
        </View>
      ) : (
        calendar.upcoming.map((item) => (
          <View key={item.id} className="mt-3 flex-row justify-between">
            <Typography variant="caption" className="text-muted">
              {formatShortDate(item.dueDate)}
            </Typography>
            <Typography variant="body" className="mx-2 flex-1">
              {item.title}
            </Typography>
            <Typography variant="caption" className="text-muted">
              {upcomingDueLabel(item)}
            </Typography>
          </View>
        ))
      )}

      <Typography variant="label" className="mt-5 text-gold">
        HISTORY
      </Typography>
      {calendar.history.length === 0 ? (
        <Typography variant="caption" className="mt-2 text-subtle">
          No health history yet.
        </Typography>
      ) : (
        calendar.history.map((item) => (
          <View key={item.id} className="mt-2">
            <Typography variant="body">{item.title}</Typography>
            <Typography variant="caption" className="text-muted">
              {[formatShortDate(item.eventDate), item.administeredBy].filter(Boolean).join(' · ')}
            </Typography>
          </View>
        ))
      )}
    </View>
  );
}
