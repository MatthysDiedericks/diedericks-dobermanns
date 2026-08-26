import { View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import type { Vaccination } from '@/types/app.types';
import {
  dueWording,
  latestPerGroup,
  vaccinationGroupKey,
} from '@/lib/dogs/healthCalendar';
import { formatKennelDate } from '@/lib/kennel/formatters';

interface DogHealthTabProps {
  vaccinations: Vaccination[];
}

export function DogHealthTab({ vaccinations }: DogHealthTabProps) {
  const latestIds = new Set(
    latestPerGroup(
      vaccinations,
      (v) => vaccinationGroupKey(v.vaccine_name),
      (v) => v.date_administered,
    ).map((v) => v.id),
  );

  return (
    <View className="px-6 pb-8">
      <Typography variant="label" className="mb-2 text-gold">
        VACCINATIONS
      </Typography>
      <Card>
        {vaccinations.length === 0 ? (
          <Typography variant="bodyMuted">No records yet.</Typography>
        ) : (
          vaccinations.map((v, i) => (
            <View
              key={v.id}
              className={`py-3 ${i < vaccinations.length - 1 ? 'border-b border-gold/10' : ''}`}
            >
              <Typography variant="body">{v.vaccine_name}</Typography>
              <Typography variant="caption" className="mt-1 text-subtle">
                Given {formatKennelDate(v.date_administered)}
              </Typography>
              {latestIds.has(v.id) && dueWording(v.next_due_date) ? (
                <Typography variant="caption" className="mt-1 text-muted">
                  {dueWording(v.next_due_date)}
                </Typography>
              ) : null}
            </View>
          ))
        )}
      </Card>
    </View>
  );
}
