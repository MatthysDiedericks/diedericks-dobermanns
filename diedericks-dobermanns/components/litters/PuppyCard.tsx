import { useRouter } from 'expo-router';
import { Pressable, View } from 'react-native';

import { CollarDot, collarLabel } from '@/lib/litters/collarColours';
import { Card } from '@/components/ui/Card';
import { Typography } from '@/components/ui/Typography';
import { formatPuppyAge } from '@/lib/kennel/formatters';
import { formatKennelDate } from '@/lib/kennel/formatters';

interface PuppyCardProps {
  id: string;
  name: string;
  sex: string | null;
  colour: string | null;
  collar_colour: string | null;
  date_of_birth: string | null;
}

export function PuppyCard({ id, name, sex, colour, collar_colour, date_of_birth }: PuppyCardProps) {
  const router = useRouter();
  const isFemale = sex === 'female';
  const borderClass = isFemale ? 'border-l-4 border-pink-400' : 'border-l-4 border-blue-400';
  const displayName = colour ? `${name} (${colour})` : name;

  return (
    <Pressable onPress={() => router.push(`/(admin)/dogs/${id}` as never)} className="flex-1 min-w-[140px]">
      <Card className={borderClass}>
        <Typography variant="subtitle" numberOfLines={1}>
          {isFemale ? '♀' : '♂'} {displayName}
        </Typography>
        <Typography variant="caption" className="mt-1 text-subtle">
          {date_of_birth ? `${formatKennelDate(date_of_birth)} · ${formatPuppyAge(date_of_birth)}` : '—'}
        </Typography>
        <View className="mt-2 flex-row items-center gap-2">
          <CollarDot colour={collar_colour} />
          <Typography variant="caption">{collarLabel(collar_colour)}</Typography>
        </View>
      </Card>
    </Pressable>
  );
}
