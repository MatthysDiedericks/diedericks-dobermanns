import { View } from 'react-native';

import { Typography } from '@/components/ui/Typography';
import { formatKennelDate } from '@/lib/kennel/formatters';
import { collectionCountdown } from '@/lib/dogs/collectionCountdown';
import { liveAgeFromDob } from '@/lib/dogs/liveAge';
import { programmeTierLabel } from '@/lib/dogs/programmeTier';
import { collarHex, collarLabel } from '@/lib/litters/collarColours';
import { colourLabel } from '@/lib/colours/dogColours';
import type { Dog } from '@/types/app.types';

function sexSymbol(sex: string | null | undefined): string | null {
  const s = (sex ?? '').toLowerCase();
  if (s.startsWith('f')) return '♀';
  if (s.startsWith('m')) return '♂';
  return sex?.trim() || null;
}

export function DogProfileHeaderBlock({
  dog,
  goHomeDate,
  buyerName,
}: {
  dog: Dog;
  goHomeDate?: string | null;
  buyerName?: string | null;
}) {
  const call = dog.call_name?.trim() || dog.name;
  const registered = dog.registered_name?.trim();
  const showRegistered = registered && registered !== call && registered !== dog.name;
  const age = liveAgeFromDob(dog.date_of_birth);
  const countdown = collectionCountdown(goHomeDate ?? dog.handover_date);
  const collar = dog.collar_colour && dog.collar_colour !== 'none';
  const facts = [
    sexSymbol(dog.sex),
    age,
    dog.date_of_birth ? formatKennelDate(dog.date_of_birth) : null,
    dog.colour ? colourLabel(dog.colour) : null,
  ].filter(Boolean);

  return (
    <View className="mb-4 flex-row items-start gap-3">
      {collar ? (
        <View
          className="mt-1 h-5 w-5 rounded-full border border-gold/40"
          style={{ backgroundColor: collarHex(dog.collar_colour) }}
          accessibilityLabel={collarLabel(dog.collar_colour)}
        />
      ) : null}
      <View className="flex-1">
        <Typography variant="title">{call}</Typography>
        {showRegistered ? (
          <Typography variant="caption" className="mt-1 text-muted">
            {registered}
          </Typography>
        ) : dog.name !== call ? (
          <Typography variant="caption" className="mt-1 text-muted">
            {dog.name}
          </Typography>
        ) : null}
        {buyerName ? (
          <Typography variant="body" className="mt-1">
            {buyerName}
          </Typography>
        ) : null}
        <Typography variant="body" className="mt-2">
          {facts.join(' · ') || '—'}
        </Typography>
        <Typography variant="caption" className="mt-1 text-muted">
          Programme {programmeTierLabel(dog.programme_tier)}
        </Typography>
        {countdown ? (
          <Typography variant="subtitle" className="mt-3 text-gold">
            {countdown}
          </Typography>
        ) : null}
      </View>
    </View>
  );
}
