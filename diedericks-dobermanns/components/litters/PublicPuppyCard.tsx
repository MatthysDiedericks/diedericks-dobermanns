import { View } from 'react-native';

import { DogStatusBadge } from '@/components/dogs/DogStatusBadge';
import { ThumbImage } from '@/components/media/ThumbImage';
import { Typography } from '@/components/ui/Typography';
import { titleCase } from '@/lib/format';
import { CollarDot } from '@/lib/litters/collarColours';
import { formatWeightGrams } from '@/lib/litters/weighingSchedule';
import type { DogStatus } from '@/types/app.types';

interface PublicPuppyCardProps {
  name: string;
  sex: string | null;
  collarColour: string | null;
  status: string;
  photoUrl: string | null;
  latestWeightKg: number | null;
}

/** Read-only puppy card for the public litter page — no buyer/reservation info. */
export function PublicPuppyCard({
  name,
  sex,
  collarColour,
  status,
  photoUrl,
  latestWeightKg,
}: PublicPuppyCardProps) {
  return (
    <View className="w-[48%] overflow-hidden rounded-2xl border border-gold/15 bg-black-rich">
      <View className="h-32 w-full items-center justify-center bg-surface">
        {photoUrl ? (
          <ThumbImage uri={photoUrl} />
        ) : (
          <CollarDot colour={collarColour} size={24} />
        )}
      </View>
      <View className="p-3">
        <View className="flex-row items-center gap-2">
          <CollarDot colour={collarColour} />
          <Typography variant="subtitle" className="flex-1">
            {name}
          </Typography>
        </View>
        <Typography variant="caption" className="mt-1">
          {titleCase(sex)}
        </Typography>
        <View className="mt-2 flex-row items-center justify-between">
          <DogStatusBadge status={status as DogStatus} />
          {latestWeightKg != null ? (
            <Typography variant="caption" className="text-gold">
              {formatWeightGrams(latestWeightKg)}
            </Typography>
          ) : null}
        </View>
      </View>
    </View>
  );
}
