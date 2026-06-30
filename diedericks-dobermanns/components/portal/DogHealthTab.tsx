import { differenceInCalendarDays, parseISO } from 'date-fns';
import { View } from 'react-native';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import type { Vaccination } from '@/types/app.types';
import { formatKennelDate } from '@/lib/kennel/formatters';

function vaxStatus(nextDue: string | null): {
  label: string;
  tone: 'success' | 'gold' | 'danger';
} {
  if (!nextDue) return { label: 'UP TO DATE', tone: 'success' };
  const days = differenceInCalendarDays(parseISO(nextDue.slice(0, 10)), new Date());
  if (days < 0) return { label: 'OVERDUE', tone: 'danger' };
  if (days <= 60) return { label: 'DUE SOON', tone: 'gold' };
  return { label: 'UP TO DATE', tone: 'success' };
}

interface DogHealthTabProps {
  vaccinations: Vaccination[];
}

export function DogHealthTab({ vaccinations }: DogHealthTabProps) {
  return (
    <View className="px-6 pb-8">
      <Typography variant="label" className="mb-2 text-gold">
        VACCINATIONS
      </Typography>
      <Card>
        {vaccinations.length === 0 ? (
          <Typography variant="bodyMuted">No records yet.</Typography>
        ) : (
          vaccinations.map((v, i) => {
            const status = vaxStatus(v.next_due_date);
            return (
              <View
                key={v.id}
                className={`py-3 ${i < vaccinations.length - 1 ? 'border-b border-gold/10' : ''}`}
              >
                <View className="flex-row items-start justify-between gap-2">
                  <Typography variant="body" className="flex-1">
                    {v.vaccine_name}
                  </Typography>
                  <Badge label={status.label} tone={status.tone} />
                </View>
                <Typography variant="caption" className="mt-1 text-subtle">
                  Given {formatKennelDate(v.date_administered)}
                  {v.next_due_date ? ` · Next due ${formatKennelDate(v.next_due_date)}` : ''}
                </Typography>
              </View>
            );
          })
        )}
      </Card>
    </View>
  );
}
