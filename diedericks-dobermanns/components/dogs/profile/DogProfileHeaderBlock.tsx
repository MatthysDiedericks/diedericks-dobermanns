import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { formatKennelDate } from '@/lib/kennel/formatters';
import { collectionCountdown } from '@/lib/dogs/collectionCountdown';
import { ageFromDob, titleCase } from '@/lib/format';
import type { Dog } from '@/types/app.types';

export function DogProfileHeaderBlock({
  dog,
  goHomeDate,
}: {
  dog: Dog;
  goHomeDate?: string | null;
}) {
  const call = dog.call_name?.trim();
  const registered = dog.registered_name?.trim();
  const dobRaw = dog.date_of_birth ? formatKennelDate(dog.date_of_birth) : null;
  const dob = dobRaw && dobRaw !== '—' ? dobRaw : null;
  const facts = [
    dog.collar_colour ? `Collar ${titleCase(dog.collar_colour)}` : null,
    dog.sex ? titleCase(dog.sex) : null,
    dog.colour ? titleCase(dog.colour) : null,
    dob,
    ageFromDob(dog.date_of_birth),
  ].filter(Boolean);
  const countdown = collectionCountdown(goHomeDate ?? dog.handover_date);

  return (
    <View className="mb-4">
      <Typography variant="title">{dog.name}</Typography>
      {call && call !== dog.name ? (
        <Typography variant="caption" className="mt-1 text-muted">
          Call name {call}
        </Typography>
      ) : null}
      {registered && registered !== dog.name && registered !== call ? (
        <Typography variant="caption" className="mt-1 text-muted">
          {registered}
        </Typography>
      ) : null}
      {facts.length > 0 ? (
        <Typography variant="body" className="mt-2">
          {facts.join(' · ')}
        </Typography>
      ) : null}
      {countdown ? (
        <Typography variant="subtitle" className="mt-3 text-gold">
          {countdown}
        </Typography>
      ) : null}
    </View>
  );
}
