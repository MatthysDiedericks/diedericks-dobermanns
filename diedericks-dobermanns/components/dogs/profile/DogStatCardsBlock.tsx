import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { upcomingDueLabel } from '@/lib/dogs/healthCalendar';
import { formatWeight } from '@/lib/kennel/formatters';
import type { HealthCalendar } from '@/lib/dogs/healthCalendar';

export function DogStatCardsBlock({
  latestKg,
  benchmarkLabel,
  vaccinationsCount,
  calendar,
  microchip,
}: {
  latestKg: number | null;
  benchmarkLabel: string | null;
  vaccinationsCount: number;
  calendar: HealthCalendar;
  microchip: string | null;
}) {
  const nextVacc = calendar.upcoming.find((u) => u.kind === 'vaccination');
  return (
    <View className="mb-4 gap-3">
      <View className="rounded-xl border border-gold/20 bg-surface p-4">
        <Typography variant="label" className="text-gold">
          WEIGHT
        </Typography>
        {latestKg != null ? (
          <>
            <Typography variant="subtitle" className="mt-2 text-gold">
              {formatWeight(latestKg)}
            </Typography>
            {benchmarkLabel ? (
              <Typography variant="caption" className="mt-1 text-muted">
                {benchmarkLabel}
              </Typography>
            ) : null}
          </>
        ) : (
          <Typography variant="caption" className="mt-2 text-subtle">
            No weight recorded yet
          </Typography>
        )}
      </View>
      <View className="rounded-xl border border-gold/20 bg-surface p-4">
        <Typography variant="label" className="text-gold">
          VACCINATIONS
        </Typography>
        {vaccinationsCount === 0 ? (
          <Typography variant="caption" className="mt-2 text-subtle">
            None recorded yet
          </Typography>
        ) : (
          <>
            <Typography variant="body" className="mt-2">
              {vaccinationsCount} recorded
            </Typography>
            {nextVacc ? (
              <Typography variant="caption" className="mt-1 text-muted">
                Next {upcomingDueLabel(nextVacc)}
              </Typography>
            ) : null}
          </>
        )}
      </View>
      <View className="rounded-xl border border-gold/20 bg-surface p-4">
        <Typography variant="label" className="text-gold">
          MICROCHIP
        </Typography>
        {microchip?.trim() ? (
          <Typography variant="body" className="mt-2">
            {microchip.trim()}
          </Typography>
        ) : (
          <Typography variant="caption" className="mt-2 text-subtle">
            Not yet recorded
          </Typography>
        )}
      </View>
    </View>
  );
}
